import { createSandbox } from '@metamask/utils/node';
import type {
  ExecaChildProcess,
  ExecaReturnValue,
  Options as ExecaOptions,
} from 'execa';
import { mock } from 'jest-mock-extended';
import os from 'os';
import { inspect, isDeepStrictEqual } from 'util';

import type { MetaMaskRepository } from '../src/establish-metamask-repository';
import { RepositoryFilesystem } from '../src/repository-filesystem';

const { withinSandbox } = createSandbox('module-lint-tests');

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
 * Represents the result of either a successful or failed invocation of `execa`.
 *
 * @property result - The desired properties of the resulting object in the case
 * of success.
 * @property error - The desired error in the case of failure.
 */
export type ExecaMockInvocationResult =
  | { result?: Partial<ExecaReturnValue> }
  | { error?: Error };

/**
 * An element in the array of mocks that you can pass to `mockExeca` in order to
 * mock a particular invocation of `execa`.
 */
export type ExecaInvocationMock = {
  args: Parameters<PrimaryExecaFunction>;
} & ExecaMockInvocationResult;

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
  invocationMocks: ExecaInvocationMock[],
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
 * Constructs a MetaMaskRepository object for use in testing.
 *
 * @param overrides - Overrides for the new MetaMaskRepository.
 * @param overrides.shortname - The shortname.
 * @param overrides.directoryPath - The directory path.
 * @param overrides.defaultBranchName - The default branch name.
 * @param overrides.lastFetchedDate - The last fetched date.
 * @param overrides.fs - The RepositoryFilesystem object.
 * @returns The constructed MetaMaskRepository.
 */
export function buildMetaMaskRepository({
  shortname = 'template',
  directoryPath = os.tmpdir(),
  defaultBranchName = 'main',
  lastFetchedDate = null,
  fs = new RepositoryFilesystem(directoryPath),
}: Partial<MetaMaskRepository> = {}): MetaMaskRepository {
  return {
    shortname,
    directoryPath,
    defaultBranchName,
    lastFetchedDate,
    fs,
  };
}
