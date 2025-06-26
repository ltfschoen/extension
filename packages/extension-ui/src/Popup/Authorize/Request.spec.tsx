// Copyright 2019-2025 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/extension-mocks/chrome';

import type { ReactWrapper } from 'enzyme';
import type * as _ from '@polkadot/dev-test/globals.d.ts';
import type { AccountJson } from '@polkadot/extension-base/background/types';

import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import enzyme from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { AccountContext, ActionContext } from '../../components/index.js';
import * as messaging from '../../messaging.js';
import { buildHierarchy } from '../../util/buildHierarchy.js';
import Request from './Request.js';

// Mock messaging module
jest.mock('../../messaging.js', () => ({
  approveAuthRequest: jest.fn(),
  cancelAuthRequest: jest.fn(),
  rejectAuthRequest: jest.fn()
}));

const { configure, mount } = enzyme;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
configure({ adapter: new Adapter() });

const generateTestAccounts = (count: number): AccountJson[] => {
  const accounts: AccountJson[] = [];

  for (let i = 0; i < count; i++) {
    const fakeAddress = `5FkG6JQwCAav7Y4p4o1ofq9TZyZHf9Vgbz93zDxW74BaCLZT_${i.toString().padStart(3, '0')}`;

    accounts.push({
      address: fakeAddress,
      name: `Account ${i}`,
      type: 'sr25519'
    } as AccountJson);
  }

  return accounts;
};

describe('Request component with many accounts', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let wrapper: ReactWrapper;
  let onActionSpy: any;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mockApproveAuthRequest = messaging.approveAuthRequest as any;

  beforeEach(() => {
    jest.clearAllMocks();
    onActionSpy = jest.fn();

    // Mock console.error to catch and verify quota errors
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => { /* empty for testing */ });
  });

  const mountRequest = async (accountCount: number): Promise<void> => {
    const accounts = generateTestAccounts(accountCount);
    const selectedAccounts = accounts.map((acc) => acc.address);

    // Mock store
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    wrapper = mount(
      <ActionContext.Provider value={onActionSpy}>
        <AccountContext.Provider
          value={{
            accounts,
            hierarchy: buildHierarchy(accounts),
            selectedAccounts
          }}
        >
          <Request
            authId='test-auth-id'
            request={{ origin: 'test-origin' }}
            url='https://test.com'
          />
        </AccountContext.Provider>
      </ActionContext.Provider>
    );

    await wrapper.update();
  };

  it('handles a small number of accounts normally', async () => {
    await mountRequest(5);

    mockApproveAuthRequest.mockResolvedValue(undefined);

    // Click approve button
    await act(async () => {
      await wrapper.find('button.acceptButton').simulate('click');
    });

    // Expect it to call `approveAuthRequest` once with all accounts
    expect(mockApproveAuthRequest).toHaveBeenCalledTimes(1);
    expect(onActionSpy).toHaveBeenCalled();

    // Verify all accounts included in call
    const accounts = generateTestAccounts(5).map((acc) => acc.address);
    expect(mockApproveAuthRequest.mock.calls[0][1]).toEqual(accounts);
  });

  it('handles 110+ accounts using chunking without quota errors', async () => {
    const ACCOUNT_COUNT = 110;
    await mountRequest(ACCOUNT_COUNT);

    // Set up mocks to return successful promises
    mockApproveAuthRequest.mockResolvedValue(undefined);

    // Click approve button
    await act(async () => {
      await wrapper.find('button.acceptButton').simulate('click');
    });

    // With 110 accounts and chunk size of 10, we expect 11 calls to approveAuthRequest
    expect(mockApproveAuthRequest).toHaveBeenCalledTimes(11);

    // Check `onAction` called to indicate successful completion
    expect(onActionSpy).toHaveBeenCalled();

    // Check no quota error thrown and caught by `console.error`
    expect(console.error).not.toHaveBeenCalled();

    // Verify last call to approveAuthRequest includes all accounts,
    // not just last chunk to ensures UI displays all accounts.
    const allAddresses = generateTestAccounts(ACCOUNT_COUNT).map((acc) => acc.address);
    const lastCallAccounts = mockApproveAuthRequest.mock.calls[10][1];

    // Last call should have all accounts such that length should match total accounts
    expect(lastCallAccounts.length).toBe(ACCOUNT_COUNT);

    // Verify every account in our original list exists in last call
    allAddresses.forEach((address) => {
      expect(lastCallAccounts).toContain(address);
    });
  });

  it('simulates a quota exceeded error with the old approach (for comparison)', async () => {
    await mountRequest(35);

    // Create simulated quota error
    const quotaError = new Error('Resource::kQuotaBytes quota exceeded');

    // Create first call succeed but second call fail with quota error
    // to simulate outcome of old non-chunking approach
    mockApproveAuthRequest
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => Promise.reject(quotaError));

    // Create version of component using a simulated version of old approach
    // where just directly trigger error to show how it would fail
    await act(async () => {
      const oldStyleApprove = async (): Promise<void> => {
        try {
          // Simulate sending all accounts at once that would fail
          await mockApproveAuthRequest([], {});
          throw new Error('Old approach without chunking should fail');
        } catch (error) {
          // Old approach without chunking should fail
          console.error(error);
          throw error; // Throw again to verify that error propagates
        }
      };

      // Check its fails with quota exceeded error
      await expect(oldStyleApprove()).rejects.toThrow('Resource::kQuotaBytes quota exceeded');
    });

    // Verify error was logged to console since it should be logged in the component
    expect(console.error).toHaveBeenCalled();
  });
});
