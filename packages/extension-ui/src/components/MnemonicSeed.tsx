// Copyright 2019-2023 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ThemeProps } from '../types.js';

import { faCopy } from '@fortawesome/free-regular-svg-icons';
import React, { MouseEventHandler } from 'react';

import useTranslation from '../hooks/useTranslation.js';
import { styled } from '../styled.js';
import ActionText from './ActionText.js';
import TextAreaWithLabel from './TextAreaWithLabel.js';

interface Props {
  seed: string;
  onCopy: MouseEventHandler<HTMLDivElement>;
  className?: string;
}

function MnemonicSeed ({ className, onCopy, seed }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <TextAreaWithLabel
        className='mnemonicDisplay'
        isReadOnly
        label={t<string>('Generated 12-word mnemonic seed:')}
        value={seed}
      />
      <div className='buttonsRow'>
        <ActionText
          className='copyBtn'
          data-seed-action='copy'
          icon={faCopy}
          onClick={onCopy}
          text={t<string>('Copy to clipboard')}
        />
      </div>
    </div>
  );
}

export default styled(MnemonicSeed)(({ theme }: ThemeProps) => `
  margin-bottom: 21px;

  .buttonsRow {
    display: flex;
    flex-direction: row;

    .copyBtn {
      margin-right: 32px;
    }
  }

  .mnemonicDisplay {
    textarea {
      color: ${theme.primaryColor};
      font-size: ${theme.fontSize};
      height: unset;
      letter-spacing: -0.01em;
      line-height: ${theme.lineHeight};
      margin-bottom: 10px;
      padding: 14px;
    }
  }
`);
