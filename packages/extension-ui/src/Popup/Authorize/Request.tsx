// Copyright 2019-2025 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { RequestAuthorizeTab } from '@polkadot/extension-base/background/types';

import React, { useCallback, useContext, useEffect, useState } from 'react';

import { AccountContext, ActionContext } from '../../components/index.js';
import { useTranslation } from '../../hooks/index.js';
import { approveAuthRequest, cancelAuthRequest, rejectAuthRequest } from '../../messaging.js';
import { AccountSelection } from '../../partials/index.js';
import { styled } from '../../styled.js';
import NoAccount from './NoAccount.js';

interface Props {
  authId: string;
  className?: string;
  request: RequestAuthorizeTab;
  url: string;
}

function Request ({ authId, className, request: { origin }, url }: Props): React.ReactElement<Props> {
  const { accounts, selectedAccounts = [], setSelectedAccounts } = useContext(AccountContext);
  const { t } = useTranslation();
  const onAction = useContext(ActionContext);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    const defaultAccountSelection = accounts
      .filter(({ isDefaultAuthSelected }) => !!isDefaultAuthSelected)
      .map(({ address }) => address);

    setSelectedAccounts && setSelectedAccounts(defaultAccountSelection);
  }, [accounts, setSelectedAccounts]);

  const _onApprove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedAccounts.length === 0) {
        return;
      }

      // Process accounts in smaller chunks in order to avoid exceeding quota
      // and the error `Resource::kQuotaBytes quota exceeded error`.
      // Always send the full list of approved accounts processed so far to ensure
      // extension maintains a complete record of all approved accounts.
      const processAccountsInChunks = async (allAccounts: string[], chunkSize = 10) => {
        // If the account list is small enough, process it directly
        if (allAccounts.length <= chunkSize) {
          await approveAuthRequest(authId, allAccounts);
          return;
        }

        // Process in chunks for larger lists but always send cumulative list
        // to ensure we don't lose any accounts from previous chunks
        const approvedSoFar: string[] = [];

        for (let i = 0; i < allAccounts.length; i += chunkSize) {
          const currentChunk = allAccounts.slice(i, i + chunkSize);

          // Add current chunk to running list of approved accounts
          approvedSoFar.push(...currentChunk);

          if (i > 0) {
            // Add small delay between chunks to avoid overwhelming message system
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Send complete list of accounts approved so far
          await approveAuthRequest(authId, approvedSoFar);
        }
      };

      processAccountsInChunks(selectedAccounts)
        .then(() => onAction())
        .catch((error: Error) => console.error(error));
    },
    [authId, onAction, selectedAccounts]
  );

  const _onReject = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.preventDefault();
      e.stopPropagation();

      const rejectFunction = dontAskAgain ? rejectAuthRequest : cancelAuthRequest;

      rejectFunction(authId)
        .then(() => onAction())
        .catch((error: Error) => console.error(error));
    },
    [authId, dontAskAgain, onAction]
  );

  const _onToggleDontAskAgain = useCallback(
    (): void => {
      setDontAskAgain((prev) => !prev);
    },
    []
  );

  if (!accounts.length) {
    return <NoAccount authId={authId} />;
  }

  return (
    <div className={className}>
      <AccountSelection
        origin={origin}
        url={url}
      />
      <div className='footer'>
        <div className='buttonContainer'>
          <button
            className='acceptButton'
            disabled={selectedAccounts.length === 0}
            onClick={_onApprove}
          >
            {t('Connect {{total}} account(s)', { replace: {
              total: selectedAccounts.length
            } })}
          </button>
          <button
            className='rejectButton'
            onClick={_onReject}
          >
            {t('Reject')}
          </button>
        </div>
        <div className='dontAskAgainContainer'>
          <input
            checked={dontAskAgain}
            onChange={_onToggleDontAskAgain}
            type='checkbox'
          />
          <label>{t("Don't ask again")}</label>
        </div>
      </div>
    </div>

  );
}

export default styled(Request)<Props>`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;

  .footer {
    padding: 1rem 1rem 0rem 1rem;
    background: var(--background);
  }

  .buttonContainer {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .acceptButton, .rejectButton {
    width: 48%;
    height: 40px;
    border: none;
    border-radius: var(--borderRadius);
    cursor: pointer;
    font-size: 15px;
    line-height: 20px;
  }

  .acceptButton {
    background: var(--buttonBackground);
    color: var(--buttonTextColor);
  }

  .acceptButton:hover:not(:disabled) {
    background: var(--buttonBackgroundHover);
  }

  .acceptButton:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .rejectButton {
    background: var(--buttonBackgroundDanger);
    color: var(--buttonTextColor);
  }

  .rejectButton:hover {
    background: var(--buttonBackgroundDangerHover);
  }

  .dontAskAgainContainer {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    input {
      margin-right: 0.5rem;
    }
  }
`;
