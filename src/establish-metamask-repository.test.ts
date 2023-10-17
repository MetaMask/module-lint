import { ensureDirectoryStructureExists } from '@metamask/utils/node';
import type { ExecaChildProcess } from 'execa';
import execa from 'execa';
import nock from 'nock';
import path from 'path';
import { MockWritable } from 'stdio-mock';

import { establishMetaMaskRepository } from './establish-metamask-repository';
import { OutputLogger } from './output-logger';
import type { PrimaryExecaFunction } from '../tests/helpers';
import {
  buildExecaError,
  setupToolWithMockRepository,
  buildExecaResult,
  fakeDateOnly,
  withinSandbox,
} from '../tests/helpers';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('establishMetaMaskRepository', () => {
  beforeEach(() => {
    fakeDateOnly();
    nock.disableNetConnect();
    execaMock.mockImplementation((): ExecaChildProcess => {
      return buildExecaResult({ stdout: '' });
    });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.useRealTimers();
  });

  describe('given the path to an existing directory relative to the working directory', () => {
    describe('if it is not a Git repository', () => {
      it('throws', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const workingDirectoryPath = path.join(
            sandboxDirectoryPath,
            'working',
          );
          const projectDirectoryPath = path.join(
            workingDirectoryPath,
            'not-a-repo',
          );
          await ensureDirectoryStructureExists(projectDirectoryPath);
          const {
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
          } = await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: false,
            },
            validRepositories: [],
          });
          const stdout = new MockWritable();
          const stderr = new MockWritable();
          const outputLogger = new OutputLogger({ stdout, stderr });

          await expect(
            establishMetaMaskRepository({
              repositoryReference: 'not-a-repo',
              workingDirectoryPath,
              validRepositoriesCachePath,
              cachedRepositoriesDirectoryPath,
              outputLogger,
            }),
          ).rejects.toThrow(
            `${projectDirectoryPath} is not a Git repository, cannot proceed.`,
          );
        });
      });
    });

    describe('if it is a Git repository', () => {
      it('throws if the current branch of the repository is an empty string', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const workingDirectoryPath = path.join(
            sandboxDirectoryPath,
            'working',
          );
          const {
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
            repository,
          } = await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: true,
              parentDirectoryPath: workingDirectoryPath,
              commandMocks: {
                'git symbolic-ref HEAD': () => buildExecaResult({ stdout: '' }),
              },
            },
            validRepositories: [],
          });
          const stdout = new MockWritable();
          const stderr = new MockWritable();
          const outputLogger = new OutputLogger({ stdout, stderr });

          await expect(
            establishMetaMaskRepository({
              repositoryReference: repository.name,
              workingDirectoryPath,
              validRepositoriesCachePath,
              cachedRepositoriesDirectoryPath,
              outputLogger,
            }),
          ).rejects.toThrow(
            `Error establishing ${repository.directoryPath}: This repo does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
          );
        });
      });

      it('throws if the default branch of the repository cannot be detected', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const workingDirectoryPath = path.join(
            sandboxDirectoryPath,
            'working',
          );
          const {
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
            repository,
          } = await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: true,
              parentDirectoryPath: workingDirectoryPath,
              commandMocks: {
                'git symbolic-ref HEAD': () =>
                  buildExecaResult({ stdout: 'refs/heads/main' }),
                [`git rev-parse --verify main`]: () => {
                  throw buildExecaError('Main does not exist');
                },
                [`git rev-parse --verify master`]: () => {
                  throw buildExecaError('Master does not exist');
                },
              },
            },
            validRepositories: [],
          });
          const stdout = new MockWritable();
          const stderr = new MockWritable();
          const outputLogger = new OutputLogger({ stdout, stderr });

          await expect(
            establishMetaMaskRepository({
              repositoryReference: repository.name,
              workingDirectoryPath,
              validRepositoriesCachePath,
              cachedRepositoriesDirectoryPath,
              outputLogger,
            }),
          ).rejects.toThrow(
            `Could not detect default branch name for ${repository.directoryPath}.`,
          );
        });
      });

      describe.each(['main', 'master'])(
        'if the default branch is %s',
        (defaultBranchName) => {
          it('does not pull the default branch', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const workingDirectoryPath = path.join(
                  sandboxDirectoryPath,
                  'working',
                );
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    create: true,
                    parentDirectoryPath: workingDirectoryPath,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult(),
                    },
                  },
                  validRepositories: [],
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                await establishMetaMaskRepository({
                  repositoryReference: repository.name,
                  workingDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(execaMock).not.toHaveBeenNthCalledWith(
                  3,
                  'git',
                  ['pull'],
                  {
                    cwd: repository.directoryPath,
                  },
                );
              },
            );
          });

          it('returns the last fetched date if it is available', async () => {
            const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');
            const now = new Date('2023-01-01T00:00:59Z');

            jest.setSystemTime(now);

            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const workingDirectoryPath = path.join(
                  sandboxDirectoryPath,
                  'working',
                );
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    create: true,
                    parentDirectoryPath: workingDirectoryPath,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                    fetchHead: { modifiedDate: fetchHeadModifiedDate },
                  },
                  validRepositories: [],
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                const metaMaskRepository = await establishMetaMaskRepository({
                  repositoryReference: repository.name,
                  workingDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(metaMaskRepository).toMatchObject({
                  lastFetchedDate: fetchHeadModifiedDate,
                });
              },
            );
          });

          it('returns nothing for the last fetched date if the repository was never fetched (and thus .git/FETCH_HEAD does not exist)', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const workingDirectoryPath = path.join(
                  sandboxDirectoryPath,
                  'working',
                );
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    create: true,
                    parentDirectoryPath: workingDirectoryPath,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                    fetchHead: null,
                  },
                  validRepositories: [],
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                const metaMaskRepository = await establishMetaMaskRepository({
                  repositoryReference: repository.name,
                  workingDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(metaMaskRepository).toMatchObject({
                  lastFetchedDate: null,
                });
              },
            );
          });

          it('does not throw if the default branch is not selected', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const workingDirectoryPath = path.join(
                  sandboxDirectoryPath,
                  'working',
                );
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    create: true,
                    parentDirectoryPath: workingDirectoryPath,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/NOT-${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                  },
                  validRepositories: [],
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                const result = await establishMetaMaskRepository({
                  repositoryReference: repository.name,
                  workingDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(result).toBeDefined();
              },
            );
          });

          it('returns information about the repository', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const workingDirectoryPath = path.join(
                  sandboxDirectoryPath,
                  'working',
                );
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    name: 'some-repo',
                    create: true,
                    parentDirectoryPath: workingDirectoryPath,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                  },
                  validRepositories: [],
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                const metaMaskRepository = await establishMetaMaskRepository({
                  repositoryReference: 'some-repo',
                  workingDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(metaMaskRepository).toMatchObject({
                  currentBranchName: defaultBranchName,
                  defaultBranchName,
                  directoryPath: repository.directoryPath,
                  shortname: 'some-repo',
                });
              },
            );
          });
        },
      );
    });
  });

  describe('given the name of a known MetaMask repository', () => {
    describe('if the repository has already been cloned', () => {
      it('throws if the current branch of the repository is an empty string', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const {
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
            repository,
          } = await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: true,
              commandMocks: {
                'git symbolic-ref HEAD': () => buildExecaResult({ stdout: '' }),
              },
            },
          });
          const stdout = new MockWritable();
          const stderr = new MockWritable();
          const outputLogger = new OutputLogger({ stdout, stderr });

          await expect(
            establishMetaMaskRepository({
              repositoryReference: repository.name,
              workingDirectoryPath: sandboxDirectoryPath,
              validRepositoriesCachePath,
              cachedRepositoriesDirectoryPath,
              outputLogger,
            }),
          ).rejects.toThrow(
            `Error establishing ${repository.directoryPath}: This repo does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
          );
        });
      });

      it('throws if the default branch of the repository cannot be detected', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          const {
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
            repository,
          } = await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: true,
              commandMocks: {
                'git symbolic-ref HEAD': () =>
                  buildExecaResult({ stdout: 'refs/heads/main' }),
                [`git rev-parse --verify main`]: () => {
                  throw buildExecaError('Main does not exist');
                },
                [`git rev-parse --verify master`]: () => {
                  throw buildExecaError('Master does not exist');
                },
              },
            },
          });
          const stdout = new MockWritable();
          const stderr = new MockWritable();
          const outputLogger = new OutputLogger({ stdout, stderr });

          await expect(
            establishMetaMaskRepository({
              repositoryReference: repository.name,
              workingDirectoryPath: sandboxDirectoryPath,
              validRepositoriesCachePath,
              cachedRepositoriesDirectoryPath,
              outputLogger,
            }),
          ).rejects.toThrow(
            `Could not detect default branch name for ${repository.directoryPath}.`,
          );
        });
      });

      describe.each(['main', 'master'])(
        'if the default branch is %s',
        (defaultBranchName) => {
          describe('if it has been less than an hour since the repository was last fetched', () => {
            it('does not pull the default branch', async () => {
              const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');
              const now = new Date('2023-01-01T00:00:59Z');

              jest.setSystemTime(now);

              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult(),
                      },
                      fetchHead: { modifiedDate: fetchHeadModifiedDate },
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(execaMock).not.toHaveBeenNthCalledWith(
                    3,
                    'git',
                    ['pull'],
                    {
                      cwd: repository.directoryPath,
                    },
                  );
                },
              );
            });

            it('returns the last fetched date', async () => {
              const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');
              const now = new Date('2023-01-01T00:00:59Z');

              jest.setSystemTime(now);

              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult({
                            stdout: defaultBranchName,
                          }),
                      },
                      fetchHead: { modifiedDate: fetchHeadModifiedDate },
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  const metaMaskRepository = await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(metaMaskRepository).toMatchObject({
                    lastFetchedDate: fetchHeadModifiedDate,
                  });
                },
              );
            });
          });

          describe('if it has been more than an hour since the repository was last fetched', () => {
            it('pulls the default branch', async () => {
              const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');
              const now = new Date('2023-01-01T01:00:01Z');

              jest.setSystemTime(now);

              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult({
                            stdout: defaultBranchName,
                          }),
                      },
                      fetchHead: { modifiedDate: fetchHeadModifiedDate },
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(execaMock).toHaveBeenNthCalledWith(
                    defaultBranchName === 'main' ? 3 : 4,
                    'git',
                    ['pull'],
                    {
                      cwd: repository.directoryPath,
                    },
                  );
                },
              );
            });

            it('returns the last fetched date (which is now)', async () => {
              const fetchHeadModifiedDate = new Date('2023-01-01T00:00:00Z');
              const now = new Date('2023-01-01T01:00:01Z');

              jest.setSystemTime(now);

              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult({
                            stdout: defaultBranchName,
                          }),
                      },
                      fetchHead: { modifiedDate: fetchHeadModifiedDate },
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  const metaMaskRepository = await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(metaMaskRepository).toMatchObject({
                    lastFetchedDate: now,
                  });
                },
              );
            });
          });

          describe('if the repository was never fetched (and thus .git/FETCH_HEAD does not exist)', () => {
            it('pulls the default branch', async () => {
              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult({
                            stdout: defaultBranchName,
                          }),
                      },
                      fetchHead: null,
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(execaMock).toHaveBeenNthCalledWith(
                    defaultBranchName === 'main' ? 3 : 4,
                    'git',
                    ['pull'],
                    {
                      cwd: repository.directoryPath,
                    },
                  );
                },
              );
            });

            it('returns the last fetched date (which is now)', async () => {
              const now = new Date('2023-01-01T01:00:01Z');

              jest.setSystemTime(now);

              await withinSandbox(
                async ({ directoryPath: sandboxDirectoryPath }) => {
                  const {
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    repository,
                  } = await setupToolWithMockRepository({
                    execaMock,
                    sandboxDirectoryPath,
                    repository: {
                      create: true,
                      commandMocks: {
                        'git symbolic-ref HEAD': () =>
                          buildExecaResult({
                            stdout: `refs/heads/${defaultBranchName}`,
                          }),
                        [`git rev-parse --verify ${defaultBranchName}`]: () =>
                          buildExecaResult({
                            stdout: defaultBranchName,
                          }),
                      },
                      fetchHead: null,
                    },
                  });
                  const stdout = new MockWritable();
                  const stderr = new MockWritable();
                  const outputLogger = new OutputLogger({ stdout, stderr });

                  const metaMaskRepository = await establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  });

                  expect(metaMaskRepository).toMatchObject({
                    lastFetchedDate: now,
                  });
                },
              );
            });
          });

          it('throws if the default branch is not selected', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    create: true,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/NOT-${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                  },
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                await expect(
                  establishMetaMaskRepository({
                    repositoryReference: repository.name,
                    workingDirectoryPath: sandboxDirectoryPath,
                    validRepositoriesCachePath,
                    cachedRepositoriesDirectoryPath,
                    outputLogger,
                  }),
                ).rejects.toThrow(
                  `Error establishing ${repository.directoryPath}: The default branch "${defaultBranchName}" does not seem to be selected. You'll need to return it to this branch manually.`,
                );
              },
            );
          });

          it('returns information about the repository', async () => {
            await withinSandbox(
              async ({ directoryPath: sandboxDirectoryPath }) => {
                const {
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  repository,
                } = await setupToolWithMockRepository({
                  execaMock,
                  sandboxDirectoryPath,
                  repository: {
                    name: 'some-repo',
                    create: true,
                    commandMocks: {
                      'git symbolic-ref HEAD': () =>
                        buildExecaResult({
                          stdout: `refs/heads/${defaultBranchName}`,
                        }),
                      [`git rev-parse --verify ${defaultBranchName}`]: () =>
                        buildExecaResult({
                          stdout: defaultBranchName,
                        }),
                    },
                  },
                });
                const stdout = new MockWritable();
                const stderr = new MockWritable();
                const outputLogger = new OutputLogger({ stdout, stderr });

                const metaMaskRepository = await establishMetaMaskRepository({
                  repositoryReference: 'some-repo',
                  workingDirectoryPath: sandboxDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                });

                expect(metaMaskRepository).toMatchObject({
                  currentBranchName: defaultBranchName,
                  defaultBranchName,
                  directoryPath: repository.directoryPath,
                  shortname: 'some-repo',
                });
              },
            );
          });
        },
      );
    });

    describe('if the repository has not already been cloned', () => {
      describe('if the name of the repository is not a known MetaMask repository', () => {
        it('throws', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
              } = await setupToolWithMockRepository({
                execaMock,
                sandboxDirectoryPath,
                validRepositories: [
                  {
                    name: 'some-known-repo',
                    fork: false,
                    archived: false,
                  },
                ],
                repository: {
                  create: false,
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              await expect(
                establishMetaMaskRepository({
                  repositoryReference: 'unknown',
                  workingDirectoryPath: sandboxDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                }),
              ).rejects.toThrow(
                "Could not resolve 'unknown' as it is neither a reference to a directory nor the name of a known MetaMask repository.",
              );
            },
          );
        });
      });

      describe('if the name of the repository is a known MetaMask repository but is a fork', () => {
        it('throws', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
              } = await setupToolWithMockRepository({
                execaMock,
                sandboxDirectoryPath,
                validRepositories: [
                  {
                    name: 'some-known-repo',
                    fork: true,
                    archived: false,
                  },
                ],
                repository: {
                  create: false,
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              await expect(
                establishMetaMaskRepository({
                  repositoryReference: 'unknown',
                  workingDirectoryPath: sandboxDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                }),
              ).rejects.toThrow(
                "Could not resolve 'unknown' as it is neither a reference to a directory nor the name of a known MetaMask repository.",
              );
            },
          );
        });
      });

      describe('if the name of the repository is a known MetaMask repository but is archived', () => {
        it('throws', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
              } = await setupToolWithMockRepository({
                execaMock,
                sandboxDirectoryPath,
                validRepositories: [
                  {
                    name: 'some-known-repo',
                    fork: false,
                    archived: true,
                  },
                ],
                repository: {
                  create: false,
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              await expect(
                establishMetaMaskRepository({
                  repositoryReference: 'unknown',
                  workingDirectoryPath: sandboxDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                }),
              ).rejects.toThrow(
                "Could not resolve 'unknown' as it is neither a reference to a directory nor the name of a known MetaMask repository.",
              );
            },
          );
        });
      });

      describe('if the name of the repository is a known source MetaMask repository', () => {
        it('clones the repository', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
                repository,
              } = await setupToolWithMockRepository({
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
                    'git symbolic-ref HEAD': () =>
                      buildExecaResult({
                        stdout: 'refs/heads/main',
                      }),
                  },
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              await establishMetaMaskRepository({
                repositoryReference: 'some-repo',
                workingDirectoryPath: sandboxDirectoryPath,
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
                outputLogger,
              });

              expect(execaMock).toHaveBeenNthCalledWith(1, 'gh', [
                'repo',
                'clone',
                `MetaMask/some-repo`,
                repository.directoryPath,
              ]);
            },
          );
        });

        it('throws if the current branch of the cloned repository is an empty string', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
                repository,
              } = await setupToolWithMockRepository({
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
                  create: false,
                  commandMocks: {
                    'git symbolic-ref HEAD': () =>
                      buildExecaResult({ stdout: '' }),
                  },
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              await expect(
                establishMetaMaskRepository({
                  repositoryReference: repository.name,
                  workingDirectoryPath: sandboxDirectoryPath,
                  validRepositoriesCachePath,
                  cachedRepositoriesDirectoryPath,
                  outputLogger,
                }),
              ).rejects.toThrow(
                `Error establishing ${repository.directoryPath}: This repo does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
              );
            },
          );
        });

        it('returns information about the repository, including the last fetched date (which is now)', async () => {
          const now = new Date('2023-01-01T01:00:01Z');
          jest.setSystemTime(now);

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const {
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
                repository,
              } = await setupToolWithMockRepository({
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
                    'git symbolic-ref HEAD': () =>
                      buildExecaResult({
                        stdout: 'refs/heads/main',
                      }),
                  },
                },
              });
              const stdout = new MockWritable();
              const stderr = new MockWritable();
              const outputLogger = new OutputLogger({ stdout, stderr });

              const metaMaskRepository = await establishMetaMaskRepository({
                repositoryReference: 'some-repo',
                workingDirectoryPath: sandboxDirectoryPath,
                validRepositoriesCachePath,
                cachedRepositoriesDirectoryPath,
                outputLogger,
              });

              expect(metaMaskRepository).toMatchObject({
                currentBranchName: 'main',
                defaultBranchName: 'main',
                directoryPath: repository.directoryPath,
                shortname: 'some-repo',
                lastFetchedDate: now,
              });
            },
          );
        });
      });
    });
  });

  describe('given a repository reference that is neither the path of the directory of the name of a known MetaMask repository', () => {
    it('throws', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const { validRepositoriesCachePath, cachedRepositoriesDirectoryPath } =
          await setupToolWithMockRepository({
            execaMock,
            sandboxDirectoryPath,
            repository: {
              create: false,
            },
          });
        const stdout = new MockWritable();
        const stderr = new MockWritable();
        const outputLogger = new OutputLogger({ stdout, stderr });

        await expect(
          establishMetaMaskRepository({
            repositoryReference: 'nonexistent',
            workingDirectoryPath: sandboxDirectoryPath,
            validRepositoriesCachePath,
            cachedRepositoriesDirectoryPath,
            outputLogger,
          }),
        ).rejects.toThrow(
          `Could not resolve 'nonexistent' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
        );
      });
    });
  });
});
