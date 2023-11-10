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
    it('derives the shortname from the basename and assumes that the directory is not a clone of a known MetaMask repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const workingDirectoryPath = path.join(sandboxDirectoryPath, 'working');
        const repositoryDirectoryPath = path.join(
          workingDirectoryPath,
          'subdir',
          'some-repo',
        );
        await ensureDirectoryStructureExists(repositoryDirectoryPath);

        const resolvedRepositoryReference = await resolveRepositoryReference({
          repositoryReference: 'subdir/some-repo',
          workingDirectoryPath,
          cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
        });

        expect(resolvedRepositoryReference).toStrictEqual({
          repositoryShortname: 'some-repo',
          repositoryDirectoryPath,
          repositoryDirectoryExists: true,
          isKnownMetaMaskRepository: false,
        });
      });
    });
  });

  describe('given an absolute path to a directory somewhere in the filesystem', () => {
    it('derives the shortname from the basename and assumes that the directory is not a clone of a known MetaMask repository', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const repositoryDirectoryPath = path.join(
          sandboxDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(repositoryDirectoryPath);

        const resolvedRepositoryReference = await resolveRepositoryReference({
          repositoryReference: repositoryDirectoryPath,
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath: sandboxDirectoryPath,
        });

        expect(resolvedRepositoryReference).toStrictEqual({
          repositoryShortname: 'some-repo',
          repositoryDirectoryPath,
          repositoryDirectoryExists: true,
          isKnownMetaMaskRepository: false,
        });
      });
    });
  });

  describe('given the path to a previously cached MetaMask repository', () => {
    it('indicates that the repository is known', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const repositoryDirectoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(repositoryDirectoryPath);
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

        const resolvedRepositoryReference = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepositoryReference).toStrictEqual({
          repositoryShortname: 'some-repo',
          repositoryDirectoryPath,
          repositoryDirectoryExists: true,
          isKnownMetaMaskRepository: true,
        });
      });
    });
  });

  describe('given the path to a repository that was cached but is somehow not a known MetaMask repository', () => {
    it('indicates that the repository is unknown', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const repositoryDirectoryPath = path.join(
          cachedRepositoriesDirectoryPath,
          'some-repo',
        );
        await ensureDirectoryStructureExists(repositoryDirectoryPath);
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

        const resolvedRepositoryReference = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepositoryReference).toStrictEqual({
          repositoryShortname: 'some-repo',
          repositoryDirectoryPath,
          repositoryDirectoryExists: true,
          isKnownMetaMaskRepository: false,
        });
      });
    });
  });

  describe('given the path to known MetaMask repository that has not been cached yet', () => {
    it('indicates that the directory does not exist', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const cachedRepositoriesDirectoryPath = path.join(
          sandboxDirectoryPath,
          'cache',
        );
        const repositoryDirectoryPath = path.join(
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

        const resolvedRepositoryReference = await resolveRepositoryReference({
          repositoryReference: 'some-repo',
          workingDirectoryPath: sandboxDirectoryPath,
          cachedRepositoriesDirectoryPath,
        });

        expect(resolvedRepositoryReference).toStrictEqual({
          repositoryShortname: 'some-repo',
          repositoryDirectoryPath,
          repositoryDirectoryExists: false,
          isKnownMetaMaskRepository: true,
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
