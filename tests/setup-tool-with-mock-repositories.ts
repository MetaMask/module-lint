import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import fs from 'fs';
import path from 'path';

import type {
  PrimaryExecaFunction,
  ExecaMockInvocationResult,
  ExecaInvocationMock,
} from './helpers';
import { mockExeca } from './helpers';

/**
 * Metadata for commands that this tool is expected to run.
 */
type CommandMocks = Record<
  | 'git symbolic-ref HEAD'
  | 'gh repo view defaultBranchRef'
  | 'git fetch'
  | 'git clone',
  { action: () => ExecaMockInvocationResult }
> & {
  'git reset --hard origin/%s': {
    values: [string];
    action: () => ExecaMockInvocationResult;
  };
};

/**
 * Used by `setupToolWithMockRepository` to customize a repository depending on
 * the test in question.
 */
type RepositoryConfigurationOptions = {
  /**
   * The name of the repository, which will become the basename of the
   * repository's directory.
   */
  name?: string;
  /**
   * Marks whether or not this repository shows up as archived in the response
   * data of the HTTP request used to pull MetaMask repositories. If true, the
   * repository will not be linted.
   */
  isArchived?: boolean;
  /**
   * Marks whether or not this repository shows up as a fork in the response
   * data of the HTTP request used to pull MetaMask repositories. If true, the
   * repository will not be linted.
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
   * @property "git symbolic-ref HEAD" - Determines the current branch name.
   * (Default: `refs/heads/main`.)
   * @property "git rev-parse --verify main" - Verifies that `main` exists.
   * (Default: In `setupToolWithMockRepositories`, this is successful; in
   * `setupToolWithMockRepository`, this is not.)
   * @property "git rev-parse --verify master" - Verifies that `main` exists.
   * (Default: This is not successful.)
   * @property "git pull" - Pulls the latest changes on the default branch.
   * (Default: This is successful.)
   * @property "git clone" - Clones the repository. (Default: This is
   * successful.)
   */
  commandMocks?: Partial<CommandMocks>;
};

/**
 * A "complete" version of RepositoryConfiguration, with all properties filled
 * in.
 */
type RepositoryConfiguration = Required<
  Omit<RepositoryConfigurationOptions, 'parentDirectoryPath' | 'commandMocks'>
> & { directoryPath: string; commandMocks: CommandMocks };

/**
 * A repository that the GitHub API is expected to return.
 */
type GitHubRepository = {
  name: string;
  fork: boolean;
  archived: boolean;
};

/**
 * This tool uses the shell to make two kinds of interactions: perform
 * operations on a Git repository and validate that a given repository name
 * matches one of the available MetaMask repositories. Since interacting with a
 * MetaMask repository may involve an SSH key, and since the list of MetaMask
 * repositories can change at any time, in order to write deterministic and
 * maintainable tests we must mock these interactions.
 *
 * To make testing easier, then, this function provides an option to create a
 * fake repository in a sandbox, then mocks execution of commands via `execa`.
 * The exact commands executed, the nature of the repository, and whether or not
 * the repository is even created is customizable.
 *
 * @param args - The arguments to this function.
 * @param args.execaMock - The mock version of `execa`.
 * @param args.sandboxDirectoryPath - The path to the sandbox directory where we
 * can create the repository.
 * @param args.repository - Configuration options for the repository involved in
 * the test.
 * @param args.validRepositories - The list of existing MetaMask repositories
 * that the GitHub API is expected to return.
 * @returns Values for `validRepositoriesCachePath` as well as information about
 * the fake repository.
 */
export async function setupToolWithMockRepository({
  execaMock,
  sandboxDirectoryPath,
  repository: repositoryConfigurationOptions = {},
  validRepositories,
}: {
  execaMock: jest.MockedFn<PrimaryExecaFunction>;
  sandboxDirectoryPath: string;
  repository?: RepositoryConfigurationOptions;
  validRepositories?: GitHubRepository[];
}) {
  const { cachedRepositoriesDirectoryPath, repositories } =
    await setupToolWithMockRepositories({
      execaMock,
      sandboxDirectoryPath,
      repositories: [repositoryConfigurationOptions],
      ...(validRepositories ? { validRepositories } : {}),
    });
  return {
    cachedRepositoriesDirectoryPath,
    // We are always passing a repository, so we can assume we get one back.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    repository: repositories[0]!,
  };
}

/**
 * This tool uses the shell to make two kinds of interactions: perform
 * operations on a Git repository and validate that a given repository name
 * matches one of the available MetaMask repositories. Since interacting with a
 * MetaMask repository may involve an SSH key, and since the list of MetaMask
 * repositories can change at any time, in order to write deterministic and
 * maintainable tests we must mock these interactions.
 *
 * In addition, since this tool has the potential to interact with multiple
 * repositories, these interactions must be mocked for all repositories that a
 * test cares about.
 *
 * To make testing easier, then, this function provides an option to create one
 * or fake repositories in a sandbox, then mocks execution of commands via
 * `execa`. The exact commands executed, the nature of the repositories, and
 * whether or not repositories in question are even created are customizable.
 *
 * @param args - The arguments to this function.
 * @param args.execaMock - The mock version of `execa`.
 * @param args.sandboxDirectoryPath - The path to the sandbox directory where we
 * can create the repository.
 * @param args.repositories - Configuration options for the repositories
 * involved in the test.
 * @param args.validRepositories - The list of existing MetaMask repositories
 * that the GitHub API is expected to return.
 * @returns Values for `validRepositoriesCachePath` as well as information about
 * the fake repositories.
 */
export async function setupToolWithMockRepositories({
  execaMock,
  sandboxDirectoryPath,
  repositories: setOfRepositoryConfigurationOptions = [],
  validRepositories: configuredValidRepositories,
}: {
  execaMock: jest.MockedFn<PrimaryExecaFunction>;
  sandboxDirectoryPath: string;
  repositories?: RepositoryConfigurationOptions[];
  validRepositories?: GitHubRepository[];
}) {
  const cachedRepositoriesDirectoryPath = path.join(
    sandboxDirectoryPath,
    'repositories',
  );
  const repositoryConfigurations = setOfRepositoryConfigurationOptions.map(
    (repositoryConfigurationOptions) =>
      fillOutRepositoryConfiguration(
        repositoryConfigurationOptions,
        cachedRepositoriesDirectoryPath,
      ),
  );

  for (const repositoryConfiguration of repositoryConfigurations) {
    if (repositoryConfiguration.create) {
      await createMockRepository(repositoryConfiguration);
    }
  }

  const validRepositories =
    configuredValidRepositories ??
    repositoryConfigurations.map((repositoryConfiguration) => ({
      name: repositoryConfiguration.name,
      fork: repositoryConfiguration.isFork,
      archived: repositoryConfiguration.isArchived,
    }));

  const execaInvocationMocks = buildExecaInvocationMocks(
    validRepositories,
    repositoryConfigurations,
  );
  mockExeca(execaMock, execaInvocationMocks);

  return {
    cachedRepositoriesDirectoryPath,
    repositories: repositoryConfigurations,
  };
}

/**
 * Using the given configuration, creates a fake repository at a certain
 * directory. This directory can then be used and accessed by the tool as though
 * it were a real repository.
 *
 * @param repositoryConfiguration - Instructions for how to create the
 * repository.
 * @param repositoryConfiguration.directoryPath - The directory that will
 * represent the repository.
 * @param repositoryConfiguration.fetchHead - Configuration for the `FETCH_HEAD`
 * file.
 */
async function createMockRepository({
  directoryPath,
  fetchHead,
}: RepositoryConfiguration): Promise<void> {
  await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));

  if (fetchHead) {
    const { modifiedDate } = fetchHead;
    await writeFile(path.join(directoryPath, '.git', 'FETCH_HEAD'), '');
    await fs.promises.utimes(
      path.join(directoryPath, '.git', 'FETCH_HEAD'),
      modifiedDate,
      modifiedDate,
    );
  }
}

/**
 * Mocks commands that this tool executes. There are two kinds of commands. One
 * command is for retrieving the set of existing MetaMask repositories; the
 * other is for interacting with repositories (the module template and any
 * projects being linted).
 *
 * @param validRepositories - The set of valid repositories.
 * @param repositoryConfigurations - Customizations for repositories that are
 * being interacted with.
 * @returns The set of mocks that will be passed into `mockExeca`.
 */
function buildExecaInvocationMocks(
  validRepositories: GitHubRepository[],
  repositoryConfigurations: RepositoryConfiguration[],
): ExecaInvocationMock[] {
  return [
    {
      args: [
        'gh',
        ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
      ],
      result: {
        stdout: JSON.stringify(validRepositories),
      },
    },
    ...repositoryConfigurations.flatMap((repositoryConfiguration) => {
      const repositoryExecaInvocationMocks: ExecaInvocationMock[] = [
        {
          args: [
            'git',
            ['symbolic-ref', '--quiet', 'HEAD'],
            { cwd: repositoryConfiguration.directoryPath },
          ],
          ...repositoryConfiguration.commandMocks[
            'git symbolic-ref HEAD'
          ].action(),
        },
        {
          args: [
            'gh',
            [
              'repo',
              'view',
              '--json',
              'defaultBranchRef',
              '--jq',
              '.defaultBranchRef.name',
            ],
            { cwd: repositoryConfiguration.directoryPath },
          ],
          ...repositoryConfiguration.commandMocks[
            'gh repo view defaultBranchRef'
          ].action(),
        },
        {
          args: [
            'git',
            ['fetch'],
            { cwd: repositoryConfiguration.directoryPath },
          ],
          ...repositoryConfiguration.commandMocks['git fetch'].action(),
        },
        {
          args: [
            'gh',
            [
              'repo',
              'clone',
              `MetaMask/${repositoryConfiguration.name}`,
              repositoryConfiguration.directoryPath,
            ],
          ],
          ...repositoryConfiguration.commandMocks['git clone'].action(),
        },
      ];

      const gitResetMock =
        repositoryConfiguration.commandMocks['git reset --hard origin/%s'];
      const [targetBranchName] = gitResetMock.values;
      repositoryExecaInvocationMocks.push({
        args: [
          'git',
          ['reset', '--hard', `origin/${targetBranchName}`],
          { cwd: repositoryConfiguration.directoryPath },
        ],
        ...gitResetMock.action(),
      });

      return repositoryExecaInvocationMocks;
    }),
  ];
}

/**
 * Given an options object, builds a complete object that will be used to
 * instruct `setupToolWithMockRepository`, fill in missing properties with
 * reasonable defaults. This is done so that it is possible to remove irrelevant
 * information from tests.
 *
 * By default, it is assumed that the name of a repository is "some-repo", it is
 * a known MetaMask repository, it has not been fetched before, its default
 * branch is "main", "master" does not exist, and pulling the repo will work.
 * It is also assumed that if `git clone` is run, that will work too.
 *
 * @param repositoryConfigurationOptions - The repository configuration options.
 * @param cachedRepositoriesDirectoryPath - The directory where repositories are
 * cached.
 * @returns The configured repository.
 */
function fillOutRepositoryConfiguration(
  repositoryConfigurationOptions: RepositoryConfigurationOptions,
  cachedRepositoriesDirectoryPath: string,
): RepositoryConfiguration {
  const {
    name = 'some-repo',
    parentDirectoryPath: givenParentDirectoryPath,
    isFork = false,
    isArchived = false,
    fetchHead: givenFetchHead = null,
    create = false,
    commandMocks: givenCommandMocks = {},
    ...rest
  } = repositoryConfigurationOptions;

  const parentDirectoryPath =
    givenParentDirectoryPath ?? cachedRepositoriesDirectoryPath;

  const directoryPath = path.join(parentDirectoryPath, name);

  const commandMocks = {
    'git symbolic-ref HEAD': {
      action: () => ({ result: { stdout: 'refs/heads/main' } }),
    },
    'gh repo view defaultBranchRef': {
      action: () => ({
        result: { stdout: 'main' },
      }),
    },
    'git fetch': {
      action: () => ({
        result: { stdout: '' },
      }),
    },
    'git reset --hard origin/%s': {
      values: ['main'] as [string],
      action: () => ({
        result: { stdout: '' },
      }),
    },
    'git clone': {
      action: () => ({
        result: { stdout: '' },
      }),
    },
    ...givenCommandMocks,
  };

  const fetchHead = givenFetchHead
    ? { modifiedDate: givenFetchHead.modifiedDate ?? new Date() }
    : null;

  return {
    name,
    directoryPath,
    isFork,
    isArchived,
    fetchHead,
    create,
    commandMocks,
    ...rest,
  };
}
