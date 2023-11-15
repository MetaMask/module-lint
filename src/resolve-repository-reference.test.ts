import { ensureDirectoryStructureExists } from '@metamask/utils/node';
import execa from 'execa';
import path from 'path';

import { resolveRepositoryReference } from './resolve-repository-reference';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { mockExeca, withinSandbox } from '../tests/helpers';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('resolveRepositoryReference', () => {
  describe('given the path of a directory relative to the working directory', () => {
    it('throws if the directory does not look like a Git repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const workingDirectoryPath = path.join(sandboxDirectoryPath, 'working');
        const directoryPath = path.join(
          workingDirectoryPath,
          'subdir',
          'some-repo',
        );
        await ensureDirectoryStructureExists(directoryPath);

        await expect(
          resolveRepositoryReference({
            repositoryReference: 'subdir/some-repo',
            workingDirectoryPath,
            cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
          }),
        ).rejects.toThrow(
          new Error(
            `"${path.join(
              workingDirectoryPath,
              'subdir/some-repo',
            )}" is not a Git repository, cannot proceed.`,
          ),
        );
      });
    });

    it('returns information about that directory', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const workingDirectoryPath = path.join(sandboxDirectoryPath, 'working');
        const directoryPath = path.join(
          workingDirectoryPath,
          'subdir',
          'some-repo',
        );
        await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));

        const resolvedRepository = await resolveRepositoryReference({
          repositoryReference: 'subdir/some-repo',
          workingDirectoryPath,
          cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
        });

        expect(resolvedRepository).toStrictEqual({
          shortname: 'some-repo',
          directoryPath,
          exists: true,
          createdAutomatically: false,
        });
      });
    });
  });

  describe('given an absolute path to a directory somewhere in the filesystem', () => {
    it('throws if the directory does not look like a Git repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const directoryPath = path.join(
          sandboxDirectoryPath,
          'subdir/some-repo',
        );
        await ensureDirectoryStructureExists(directoryPath);

        await expect(
          resolveRepositoryReference({
            repositoryReference: directoryPath,
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
          }),
        ).rejects.toThrow(
          new Error(
            `"${directoryPath}" is not a Git repository, cannot proceed.`,
          ),
        );
      });
    });

    it('returns information about that directory', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const directoryPath = path.join(
          sandboxDirectoryPath,
          'subdir/some-repo',
        );
        await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));

        const resolvedRepository = await resolveRepositoryReference({
          repositoryReference: directoryPath,
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
        });

        expect(resolvedRepository).toStrictEqual({
          shortname: 'some-repo',
          directoryPath,
          exists: true,
          createdAutomatically: false,
        });
      });
    });
  });

  describe('given the name of a known MetaMask repository that is located in the cache directory', () => {
    it('throws if the directory somehow does not look like a Git repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const directoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(directoryPath);
        mockExeca(execaMock, [
          {
            args: [
              'gh',
              ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
            ],
            result: {
              stdout: JSON.stringify([
                { name: 'some-repo', fork: false, archived: false },
              ]),
            },
          },
        ]);

        await expect(
          resolveRepositoryReference({
            repositoryReference: 'some-repo',
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
          }),
        ).rejects.toThrow(
          new Error(
            `"${directoryPath}" is not a Git repository, cannot proceed.`,
          ),
        );
      });
    });

    it('returns information about that directory', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const directoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));
        mockExeca(execaMock, [
          {
            args: [
              'gh',
              ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
            ],
            result: {
              stdout: JSON.stringify([
                { name: 'some-repo', fork: false, archived: false },
              ]),
            },
          },
        ]);

        const resolvedRepository = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepository).toStrictEqual({
          shortname: 'some-repo',
          directoryPath,
          exists: true,
          createdAutomatically: true,
        });
      });
    });
  });

  describe('given the name of a repository located in the cache directory that is no longer a known MetaMask repository', () => {
    it('throws if the directory somehow does not look like a Git repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const directoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(directoryPath);
        mockExeca(execaMock, [
          {
            args: [
              'gh',
              ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
            ],
            result: {
              stdout: JSON.stringify([]),
            },
          },
        ]);

        await expect(
          resolveRepositoryReference({
            repositoryReference: 'some-repo',
            workingDirectoryPath: sandboxDirectoryPath,
            cachedRepositoriesDirectoryPath,
          }),
        ).rejects.toThrow(
          new Error(
            `"${directoryPath}" is not a Git repository, cannot proceed.`,
          ),
        );
      });
    });

    it('returns information about that directory', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const directoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(path.join(directoryPath, '.git'));
        mockExeca(execaMock, [
          {
            args: [
              'gh',
              ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
            ],
            result: {
              stdout: JSON.stringify([]),
            },
          },
        ]);

        const resolvedRepository = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepository).toStrictEqual({
          shortname: 'some-repo',
          directoryPath,
          exists: true,
          createdAutomatically: false,
        });
      });
    });
  });

  describe('given the name of a known MetaMask repository that has not been cached yet', () => {
    it('returns information about that directory', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const directoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        mockExeca(execaMock, [
          {
            args: [
              'gh',
              ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
            ],
            result: {
              stdout: JSON.stringify([
                { name: 'some-repo', fork: false, archived: false },
              ]),
            },
          },
        ]);

        const resolvedRepository = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepository).toStrictEqual({
          shortname: 'some-repo',
          directoryPath,
          exists: false,
          createdAutomatically: true,
        });
      });
    });
  });

  describe('given the path to a non-existent directory', () => {
    it('throws', async () => {
      mockExeca(execaMock, [
        {
          args: [
            'gh',
            ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
          ],
          result: {
            stdout: JSON.stringify([]),
          },
        },
      ]);

      await expect(
        resolveRepositoryReference({
          repositoryReference: '/tmp/clearly-not-a-directory',
          workingDirectoryPath: '/tmp/working/dir',
          cachedRepositoriesDirectoryPath: '/tmp/cache',
        }),
      ).rejects.toThrow(
        new Error(
          "Could not resolve '/tmp/clearly-not-a-directory' as it is neither a reference to a directory nor the name of a known MetaMask repository.",
        ),
      );
    });
  });
});
