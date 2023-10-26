import { createSandbox } from '@metamask/utils/node';

import { createModuleLogger, projectLogger } from '../src/logging-utils';

const { withinSandbox } = createSandbox('module-lint-tests');

export const log = createModuleLogger(projectLogger, 'tests');

export { withinSandbox };

/**
 * Uses Jest's fake timers to fake Date only.
 */
export function fakeDateOnly() {
  jest.useFakeTimers({
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}
