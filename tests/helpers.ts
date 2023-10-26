import { createSandbox } from '@metamask/utils/node';
import type {
  ExecaChildProcess,
  Options as ExecaOptions,
  ExecaReturnValue,
} from 'execa';
import { mock } from 'jest-mock-extended';
import { inspect, isDeepStrictEqual } from 'util';

import { createModuleLogger, projectLogger } from '../src/logging-utils';

const { withinSandbox } = createSandbox('module-lint-tests');

export const log = createModuleLogger(projectLogger, 'tests');

export { withinSandbox };

/**
 * `execa` can be called multiple ways. This is the way that we use it.
 */
export type PrimaryExecaFunction = (
  file: string,
  args?: readonly string[] | undefined,
  options?: ExecaOptions | undefined,
) => ExecaChildProcess;

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

/**
 * Builds an object that represents a successful result returned by `execa`.
 * This kind of object is usually a bit cumbersome to build because it's a
 * promise with extra properties glommed on to it (so it has a strange type). We
 * use `jest-mock-extended` to help with this.
 *
 * @param overrides - Properties you want to add to the result object.
 * @returns The complete `execa` result object.
 */
export function buildExecaResult(
  overrides: Partial<ExecaReturnValue> = { stdout: '' },
): ExecaChildProcess {
  return Object.assign(mock<ExecaChildProcess>(), overrides);
}

/**
 * Mocks different invocations of `execa` to do different things.
 *
 * @param execaMock - The mocked version of `execa` (as obtained via
 * `jest.mocked`).
 * @param invocationMocks - Specifies outcomes of different invocations of
 * `execa`. Each object in this array has `args` (the expected arguments to
 * `execa`) and either `result` (properties of an ExecaResult object, such as
 * `all: true`) or `error` (an Error).
 */
export function mockExeca(
  execaMock: jest.MockedFn<PrimaryExecaFunction>,
  invocationMocks: ({
    args: Parameters<PrimaryExecaFunction>;
  } & (
    | {
        result?: Partial<ExecaReturnValue>;
      }
    | {
        error?: Error;
      }
  ))[],
) {
  execaMock.mockImplementation((...args): ExecaChildProcess => {
    for (const invocationMock of invocationMocks) {
      if (isDeepStrictEqual(args, invocationMock.args)) {
        if ('error' in invocationMock && invocationMock.error) {
          throw invocationMock.error;
        }
        if ('result' in invocationMock && invocationMock.result) {
          return buildExecaResult(invocationMock.result);
        }
        throw new Error(
          `No result or error was provided for execa() invocation ${inspect(
            args,
          )}`,
        );
      }
    }

    throw new Error(`Unmocked invocation of execa() with ${inspect(args)}`);
  });
}
