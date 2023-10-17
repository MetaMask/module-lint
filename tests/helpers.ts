import {
  createSandbox,
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import type {
  ExecaChildProcess,
  ExecaError,
  ExecaReturnValue,
  Options as ExecaOptions,
} from 'execa';
import fs from 'fs';
import { mock } from 'jest-mock-extended';
import nock from 'nock';
import path from 'path';
import { inspect, isDeepStrictEqual } from 'util';

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
 * Used by `setupToolWithMockRepository` and `setupToolWithMockRepositories` to
 * customize a repository depending on the test in question.
 */
type ConfiguredRepository = {
  /**
   * The name of the repository, which will become the basename of the
   * repository's directory.
   */
  name: string;
  /**
   * Marks whether or not this repository shows up as archived in the response
   * data of the HTTP request used to pull MetaMask repositories. If true, the
   * repository will not be lintable.
   */
  isArchived?: boolean;
  /**
   * Marks whether or not this repository shows up as a fork in the response
   * data of the HTTP request used to pull MetaMask repositories. If true, the
   * repository will not be lintable.
   */
  isFork?: boolean;
  /**
   * Whether or not to create the repository. (Some tests rely on the repository
   * not to exist.)
   */
  create?: boolean;
  /**
   * Where to create the repository. By default, a repository will be placed in
   * the cached repositories directory, but sometimes it's useful to put it
   * somewhere else.
   */
  parentDirectoryPath?: string;
  /**
   * Options for the `.git/FETCH_DATE` file in the repository.
   */
  fetchHead?: { modifiedDate: Date } | null;
  /**
   * Mocks for the Git commands that this tool runs.
   *
   * Each key is shorthand for a particular command; each value is a function
   * that should either return an `execa` result object or throw an `execa`
   * error object. All keys are optional; default actions are listed for each
   * command below.
   *
   * @param "git symbolic-ref HEAD" - Determines the current branch name.
   * (Default: `refs/heads/main`.)
   * @param "git rev-parse --verify main" - Verifies that `main` exists.
   * (Default: In `setupToolWithMockRepositories`, this is successful; in
   * `setupToolWithMockRepository`, this is not.)
   * @param "git rev-parse --verify master" - Verifies that `main` exists.
   * (Default: This is not successful.)
   * @param "git pull" - Pulls the latest changes on the default branch.
   * (Default: This is successful.)
   * @param "git clone" - Clones the repository. (Default: This is successful.)
   */
  commandMocks?: Partial<
    Record<
      | 'git symbolic-ref HEAD'
      | 'git rev-parse --verify main'
      | 'git rev-parse --verify master'
      | 'git pull'
      | 'git clone',
      () => ExecaChildProcess
    >
  >;
};

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
 * This tool features two kinds of interactions with the "outside world": it
 * shells out in order to perform operations on a Git repository, and it makes
 * HTTP requests in order to validate a given repository name matches one of the
 * available MetaMask repositories. Since interacting with a MetaMask repository
 * may involve an SSH key, and since the list of MetaMask repositories can
 * change at any time, in order to write deterministic and maintainable tests we
 * must mock these interactions.
 *
 * To make testing easier, then, this function provides an option to create a
 * fake repository in a sandbox, then mocks execution of commands via `execa` as
 * well as the HTTP request responsible for pulling MetaMask repositories in
 * order to satisfy various requirements in tests that exercise the
 * aforementioned interactions. The exact commands executed, the return data for
 * the HTTP request, and whether or not the repository is even created is
 * customizable. This function also sets a default value for
 * `validRepositoriesCachePath` and `cachedRepositoriesDirectoryPath`, as that
 * is a basic requirement for higher level operations.
 *
 * @param args - The arguments to this function.
 * @param args.execaMock - The mock version of `execa`.
 * @param args.sandboxDirectoryPath - The path to the sandbox directory where we
 * can create the repository.
 * @param args.repository - Configuration options for the repository involved in
 * the test.
 * @param args.validRepositories - The list of valid repositories which will be
 * used to populate the valid repositories cache.
 * @returns Values for `validRepositoriesCachePath` and
 * `cachedRepositoriesDirectoryPath` as well as information about the fake
 * repository.
 */
export async function setupToolWithMockRepository({
  execaMock,
  sandboxDirectoryPath,
  repository: configuredRepository = {},
  validRepositories,
}: {
  execaMock: jest.MockedFn<PrimaryExecaFunction>;
  sandboxDirectoryPath: string;
  repository?: Omit<ConfiguredRepository, 'name'> & { name?: string };
  validRepositories?: { name: string; fork: boolean; archived: boolean }[];
}) {
  const {
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    repositories,
  } = await setupToolWithMockRepositories({
    execaMock,
    sandboxDirectoryPath,
    repositories: [
      {
        name: 'some-repo',
        ...configuredRepository,
        commandMocks: {
          'git rev-parse --verify main': () => {
            throw buildExecaError('Failed to run: git rev-parse --verify main');
          },
          'git rev-parse --verify master': () => {
            throw buildExecaError(
              'Failed to run: git rev-parse --verify master',
            );
          },
          ...configuredRepository.commandMocks,
        },
      },
    ],
    ...(validRepositories ? { validRepositories } : {}),
  });
  return {
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    // We are always passing a repository, so we can assume we get one back.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    repository: repositories[0]!,
  };
}

/**
 * This tool features two kinds of interactions with the "outside world": it
 * shells out in order to perform operations on a Git repository, and it makes
 * HTTP requests in order to validate a given repository name matches one of the
 * available MetaMask repositories. Since interacting with a MetaMask repository
 * may involve an SSH key, and since the list of MetaMask repositories can
 * change at any time, in order to write deterministic and maintainable tests we
 * must mock these interactions.
 *
 * In addition, since this tool has the potential to interact with multiple
 * repositories, these interactions must be mocked for all repositories that a
 * test cares about.
 *
 * To make testing easier, then, this function provides an option to create one
 * or many fake repositories in a sandbox, then mocks execution of commands via
 * `execa` as well as the HTTP request responsible for pulling MetaMask
 * repositories in order to satisfy various requirements in tests that exercise
 * the aforementioned interactions. The exact commands executed, the return data
 * for the HTTP request, and whether or not the repository is even created is
 * customizable. This function also sets a default value for
 * `validRepositoriesCachePath` and `cachedRepositoriesDirectoryPath`, as that
 * is a basic requirement for higher level operations.
 *
 * @param args - The arguments to this function.
 * @param args.execaMock - The mock version of `execa`.
 * @param args.sandboxDirectoryPath - The path to the sandbox directory where we
 * can create the repository.
 * @param args.repositories - Configuration options for the repositories
 * involved in the test.
 * @param args.validRepositories - The list of valid repositories which will be
 * used to populate the valid repositories cache.
 * @returns Values for `validRepositoriesCachePath` and
 * `cachedRepositoriesDirectoryPath` as well as information about the fake
 * repository.
 */
export async function setupToolWithMockRepositories({
  execaMock,
  sandboxDirectoryPath,
  repositories: configuredRepositories = [],
  validRepositories: configuredValidRepositories,
}: {
  execaMock: jest.MockedFn<PrimaryExecaFunction>;
  sandboxDirectoryPath: string;
  repositories?: ConfiguredRepository[];
  validRepositories?: { name: string; fork: boolean; archived: boolean }[];
}) {
  const validRepositoriesCachePath = path.join(
    sandboxDirectoryPath,
    'valid-repositories.json',
  );
  const cachedRepositoriesDirectoryPath = path.join(
    sandboxDirectoryPath,
    'repositories',
  );

  const processedRepositories = await Promise.all(
    configuredRepositories.map(async (configuredRepository) => {
      const parentDirectoryPath =
        'parentDirectoryPath' in configuredRepository
          ? configuredRepository.parentDirectoryPath
          : cachedRepositoriesDirectoryPath;
      const directoryPath = path.join(
        parentDirectoryPath,
        configuredRepository.name,
      );

      if (configuredRepository.create !== false) {
        await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));

        if (configuredRepository.fetchHead !== null) {
          const modifiedDate = configuredRepository.fetchHead
            ? configuredRepository.fetchHead.modifiedDate
            : new Date();
          await writeFile(path.join(directoryPath, '.git', 'FETCH_HEAD'), '');
          await fs.promises.utimes(
            path.join(directoryPath, '.git', 'FETCH_HEAD'),
            modifiedDate,
            modifiedDate,
          );
        }
      }

      return { ...configuredRepository, directoryPath };
    }),
  );

  const validRepositories =
    configuredValidRepositories ??
    processedRepositories.map((repository) => {
      return {
        name: repository.name,
        fork: repository.isFork ?? false,
        archived: repository.isArchived ?? false,
      };
    });
  nock('https://api.github.com')
    .get('/orgs/MetaMask/repos?per_page=100')
    .reply(200, validRepositories);

  execaMock.mockImplementation((...args): ExecaChildProcess => {
    for (const repository of processedRepositories) {
      if (
        isDeepStrictEqual(args, [
          'git',
          ['symbolic-ref', '--quiet', 'HEAD'],
          { cwd: repository.directoryPath },
        ])
      ) {
        const commandMock = repository.commandMocks?.['git symbolic-ref HEAD'];

        if (commandMock) {
          return commandMock();
        }
        return buildExecaResult({ stdout: 'refs/heads/main' });
      }

      if (
        isDeepStrictEqual(args, [
          'git',
          ['rev-parse', '--verify', '--quiet', 'main'],
          { cwd: repository.directoryPath },
        ])
      ) {
        const commandMock =
          repository.commandMocks?.['git rev-parse --verify main'];

        if (commandMock) {
          return commandMock();
        }
        return buildExecaResult();
      }

      if (
        isDeepStrictEqual(args, [
          'git',
          ['rev-parse', '--verify', '--quiet', 'master'],
          { cwd: repository.directoryPath },
        ])
      ) {
        const commandMock =
          repository.commandMocks?.['git rev-parse --verify master'];

        if (commandMock) {
          return commandMock();
        }
        throw buildExecaError('Failed to run: git rev-parse --verify master');
      }

      if (
        isDeepStrictEqual(args, [
          'git',
          ['pull'],
          { cwd: repository.directoryPath },
        ])
      ) {
        const commandMock = repository.commandMocks?.['git pull'];

        if (commandMock) {
          return commandMock();
        }
        return buildExecaResult();
      }

      if (
        isDeepStrictEqual(args, [
          'gh',
          [
            'repo',
            'clone',
            `MetaMask/${repository.name}`,
            repository.directoryPath,
          ],
        ])
      ) {
        const commandMock = repository.commandMocks?.['git clone'];

        if (commandMock) {
          return commandMock();
        }
        return buildExecaResult();
      }
    }

    throw new Error(`Unmocked invocation of execa() with ${inspect(args)}`);
  });

  return {
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    repositories: processedRepositories,
  };
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
 * Builds an object that represents an error thrown by `execa`. This kind of
 * object is usually a bit cumbersome to build because it's a promise with extra
 * properties glommed on to it (so it has a strange type). We use
 * `jest-mock-extended` to help with this.
 *
 * @param message - The message to use.
 * @returns The complete `execa` result object.
 */
export function buildExecaError(message: string): ExecaError {
  return Object.assign(new Error(message), mock<ExecaError>(), {
    failed: true,
  });
}
