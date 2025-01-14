// Copyright 2019-2023 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_PREFIX } from '../defaults.js';

let counter = 0;

export function getId (): string {
  return `${EXTENSION_PREFIX}.${Date.now()}.${++counter}`;
}
