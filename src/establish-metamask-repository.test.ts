import execa from 'execa';
import path from 'path';

import { establishMetaMaskRepository } from './establish-metamask-repository';
import { FakeOutputLogger } from '../tests/fake-output-logger';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { fakeDateOnly, withinSandbox } from '../tests/helpers';
import { setupToolWithMockRepository } from '../tests/setup-tool-with-mock-repository';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('establishMetaMaskRepository', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('given the path to an existing directory that is not a Git repository', () => {
    it('throws', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const outputLogger = new FakeOutputLogger();

        await expect(
          establishMetaMaskRepository({
            repositoryReference: sandboxDirectoryPath,
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
            outputLogger,
          }),
        ).rejects.toThrow(
          `"${sandboxDirectoryPath}" is not a Git repository, cannot proceed.`,
        );
      });
    });
  });

  describe('given the path to an existing repository relative to the working directory', () => {
    it('does not pull the latest changes', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const workingDirectoryPath = path.join(sandboxDirectoryPath, 'working');
        const { cachedRepositoriesDirectoryPath, repository } =
          await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: true,
              parentDirectoryPath: workingDirectoryPath,
            },
          });
        const outputLogger = new FakeOutputLogger();

        await establishMetaMaskRepository({
          repositoryReference: repository.name,
          workingDirectoryPath,
          cachedRepositoriesDirectoryPath,
          outputLogger,
        });

        expect(execaMock).not.toHaveBeenNthCalledWith(3, 'git', ['pull'], {
          cwd: repository.directoryPath,
        });
      });
    });

    it('returns information about the repository, even if the default branch is not selected', async () => {
      const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');

      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const workingDirectoryPath = path.join(sandboxDirectoryPath, 'working');
        const { cachedRepositoriesDirectoryPath, repository } =
          await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              name: 'some-repo',
              create: true,
              parentDirectoryPath: workingDirectoryPath,
              commandMocks: {
                'git symbolic-ref HEAD': {
                  action: () => ({
                    result: {
                      stdout: 'refs/heads/some-branch',
                    },
                  }),
                },
                'git rev-parse --verify main': {
                  action: () => ({
                    error: new Error('not found'),
                  }),
                },
                'git rev-parse --verify master': {
                  action: () => ({
                    result: {
                      stdout: '',
                    },
                  }),
                },
              },
              fetchHead: { modifiedDate: fetchHeadModifiedDate },
            },
            validRepositories: [],
          });
        const outputLogger = new FakeOutputLogger();

        const metaMaskRepository = await establishMetaMaskRepository({
          repositoryReference: 'some-repo',
          workingDirectoryPath,
          cachedRepositoriesDirectoryPath,
          outputLogger,
        });

        expect(metaMaskRepository).toMatchObject({
          shortname: 'some-repo',
          directoryPath: repository.directoryPath,
          defaultBranchName: 'master',
          lastFetchedDate: fetchHeadModifiedDate,
        });
      });
    });
  });

  describe('given the name of a known MetaMask repository', () => {
    describe('if the repository has already been cloned', () => {
      it('updates the default branch', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const { cachedRepositoriesDirectoryPath, repository } =
            await setupToolWithMockRepository({
              execaMock,
              sandboxDirectoryPath,
              repository: {
                create: true,
                commandMocks: {
                  'git symbolic-ref HEAD': {
                    action: () => ({
                      result: {
                        stdout: 'refs/heads/main',
                      },
                    }),
                  },
                  'git rev-parse --verify main': {
                    action: () => ({
                      result: {
                        stdout: '',
                      },
                    }),
                  },
                },
              },
            });
          const outputLogger = new FakeOutputLogger();

          await establishMetaMaskRepository({
            repositoryReference: repository.name,
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
            outputLogger,
          });

          expect(execaMock).toHaveBeenNthCalledWith(3, 'git', ['fetch'], {
            cwd: repository.directoryPath,
          });
          expect(execaMock).toHaveBeenNthCalledWith(
            4,
            'git',
            ['reset', '--hard', 'origin/main'],
            {
              cwd: repository.directoryPath,
            },
          );
        });
      });

      it('returns information about the repository', async () => {
        const now = new Date('2023-01-01T00:00:00Z');
        jest.setSystemTime(now);

        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const { cachedRepositoriesDirectoryPath, repository } =
            await setupToolWithMockRepository({
              execaMock,
              sandboxDirectoryPath,
              repository: {
                name: 'some-repo',
                create: true,
                commandMocks: {
                  'git symbolic-ref HEAD': {
                    action: () => ({
                      result: {
                        stdout: 'refs/heads/main',
                      },
                    }),
                  },
                  'git rev-parse --verify main': {
                    action: () => ({
                      result: {
                        stdout: '',
                      },
                    }),
                  },
                },
              },
            });
          const outputLogger = new FakeOutputLogger();

          const metaMaskRepository = await establishMetaMaskRepository({
            repositoryReference: 'some-repo',
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
            outputLogger,
          });

          expect(metaMaskRepository).toMatchObject({
            defaultBranchName: 'main',
            directoryPath: repository.directoryPath,
            shortname: 'some-repo',
            lastFetchedDate: now,
          });
        });
      });
    });

    describe('if the repository has not already been cloned', () => {
      it('clones the repository', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const { cachedRepositoriesDirectoryPath, repository } =
            await setupToolWithMockRepository({
              execaMock,
              sandboxDirectoryPath,
              validRepositories: [
                {
                  name: 'some-repo',
                  fork: false,
                  archived: false,
                },
              ],
              repository: {
                name: 'some-repo',
                create: false,
              },
            });
          const outputLogger = new FakeOutputLogger();

          await establishMetaMaskRepository({
            repositoryReference: 'some-repo',
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
            outputLogger,
          });

          expect(execaMock).toHaveBeenNthCalledWith(2, 'gh', [
            'repo',
            'clone',
            `MetaMask/some-repo`,
            repository.directoryPath,
          ]);
        });
      });

      it('returns information about the repository', async () => {
        const now = new Date('2023-01-01T01:00:01Z');
        jest.setSystemTime(now);

        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const { cachedRepositoriesDirectoryPath, repository } =
            await setupToolWithMockRepository({
              execaMock,
              sandboxDirectoryPath,
              validRepositories: [
                {
                  name: 'some-repo',
                  fork: false,
                  archived: false,
                },
              ],
              repository: {
                name: 'some-repo',
                create: false,
                commandMocks: {
                  'git symbolic-ref HEAD': {
                    action: () => ({
                      result: {
                        stdout: 'refs/heads/master',
                      },
                    }),
                  },
                  'git rev-parse --verify main': {
                    action: () => ({
                      error: new Error('not found'),
                    }),
                  },
                  'git rev-parse --verify master': {
                    action: () => ({
                      result: {
                        stdout: '',
                      },
                    }),
                  },
                },
              },
            });
          const outputLogger = new FakeOutputLogger();

          const metaMaskRepository = await establishMetaMaskRepository({
            repositoryReference: 'some-repo',
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
            outputLogger,
          });

          expect(metaMaskRepository).toMatchObject({
            defaultBranchName: 'master',
            directoryPath: repository.directoryPath,
            shortname: 'some-repo',
            lastFetchedDate: now,
          });
        });
      });
    });
  });
});
