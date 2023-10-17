import * as utils from '@metamask/utils/node';
import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import fs from 'fs';
import { mock } from 'jest-mock-extended';
import path from 'path';

import { RepositoryFilesystem } from './repository-filesystem';
import { withinSandbox } from '../tests/helpers';

jest.mock('@metamask/utils/node', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    ...jest.requireActual('@metamask/utils/node'),
  };
});

const utilsMock = jest.mocked(utils);

describe('RepositoryFilesystem', () => {
  describe('readFile', () => {
    describe('if the file has not already been read', () => {
      it('reads the file from the repository directory', async () => {
        jest.spyOn(utilsMock, 'readFile').mockResolvedValue('some content');
        const repositoryFilesystem = new RepositoryFilesystem(
          '/some/directory',
        );

        await repositoryFilesystem.readFile('some.file');

        expect(utilsMock.readFile).toHaveBeenCalledWith(
          '/some/directory/some.file',
        );
      });

      it('returns the content of the file, with extra whitespace trimmed', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          await writeFile(
            path.join(sandboxDirectoryPath, 'some.file'),
            '  some content  ',
          );
          const repositoryFilesystem = new RepositoryFilesystem(
            sandboxDirectoryPath,
          );

          const content = await repositoryFilesystem.readFile('some.file');

          expect(content).toBe('some content');
        });
      });
    });

    describe('if the file has already been read', () => {
      it('does not read the file from the repository directory again', async () => {
        jest.spyOn(utilsMock, 'readFile').mockResolvedValue('some content');
        const repositoryFilesystem = new RepositoryFilesystem(
          '/some/directory',
        );
        await repositoryFilesystem.readFile('/some/file');

        await repositoryFilesystem.readFile('/some/file');

        expect(utilsMock.readFile).toHaveBeenCalledTimes(1);
      });

      it('returns the content of the file, with extra whitespace trimmed', async () => {
        await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
          await writeFile(
            path.join(sandboxDirectoryPath, 'some.file'),
            '  some content  ',
          );
          const repositoryFilesystem = new RepositoryFilesystem(
            sandboxDirectoryPath,
          );
          await repositoryFilesystem.readFile('some.file');

          const content = await repositoryFilesystem.readFile('some.file');

          expect(content).toBe('some content');
        });
      });
    });
  });

  describe('getEntryStats', () => {
    describe('given a file', () => {
      describe('if stats have not been requested for the file already', () => {
        it('requests the stats for the file', async () => {
          jest.spyOn(fs.promises, 'stat').mockResolvedValue(mock<fs.Stats>());
          const repositoryFilesystem = new RepositoryFilesystem(
            '/some/directory',
          );

          await repositoryFilesystem.getEntryStats('some-entry');

          expect(fs.promises.stat).toHaveBeenCalledWith(
            '/some/directory/some-entry',
          );
        });

        it('returns stats for the file', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              await writeFile(path.join(sandboxDirectoryPath, 'some.file'), '');
              const repositoryFilesystem = new RepositoryFilesystem(
                sandboxDirectoryPath,
              );

              const stats = await repositoryFilesystem.getEntryStats(
                'some.file',
              );

              expect(stats).toHaveProperty('atime');
              expect(stats).toHaveProperty('ctime');
              expect(stats).toHaveProperty('mtime');
            },
          );
        });
      });

      describe('if stats have been requested for the file already', () => {
        it('does not request the stats for the file again', async () => {
          jest.spyOn(fs.promises, 'stat').mockResolvedValue(mock<fs.Stats>());
          const repositoryFilesystem = new RepositoryFilesystem(
            '/some/directory',
          );
          await repositoryFilesystem.getEntryStats('some-entry');

          await repositoryFilesystem.getEntryStats('some-entry');

          expect(fs.promises.stat).toHaveBeenCalledTimes(1);
        });

        it('returns stats for the file', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              await writeFile(path.join(sandboxDirectoryPath, 'some.file'), '');
              const repositoryFilesystem = new RepositoryFilesystem(
                sandboxDirectoryPath,
              );
              await repositoryFilesystem.getEntryStats('some.file');

              const stats = await repositoryFilesystem.getEntryStats(
                'some.file',
              );

              expect(stats).toHaveProperty('atime');
              expect(stats).toHaveProperty('ctime');
              expect(stats).toHaveProperty('mtime');
            },
          );
        });
      });
    });

    describe('given a directory', () => {
      describe('if stats have not been requested for the directory already', () => {
        it('requests the stats for the directory', async () => {
          jest.spyOn(fs.promises, 'stat').mockResolvedValue(mock<fs.Stats>());
          const repositoryFilesystem = new RepositoryFilesystem(
            '/some/directory',
          );

          await repositoryFilesystem.getEntryStats('/another/directory');

          expect(fs.promises.stat).toHaveBeenCalledWith(
            '/some/directory/another/directory',
          );
        });

        it('returns stats for the directory', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              await ensureDirectoryStructureExists(
                path.join(sandboxDirectoryPath, 'some-directory'),
              );
              const repositoryFilesystem = new RepositoryFilesystem(
                sandboxDirectoryPath,
              );

              const stats = await repositoryFilesystem.getEntryStats(
                'some-directory',
              );

              expect(stats).toHaveProperty('atime');
              expect(stats).toHaveProperty('ctime');
              expect(stats).toHaveProperty('mtime');
            },
          );
        });
      });

      describe('if stats have been requested for the directory already', () => {
        it('does not request the stats for the directory again', async () => {
          jest.spyOn(fs.promises, 'stat').mockResolvedValue(mock<fs.Stats>());
          const repositoryFilesystem = new RepositoryFilesystem(
            '/some/directory',
          );
          await repositoryFilesystem.getEntryStats('another-directory');

          await repositoryFilesystem.getEntryStats('another-directory');

          expect(fs.promises.stat).toHaveBeenCalledTimes(1);
        });

        it('returns stats for the directory', async () => {
          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              await ensureDirectoryStructureExists(
                path.join(sandboxDirectoryPath, 'some-directory'),
              );
              const repositoryFilesystem = new RepositoryFilesystem(
                sandboxDirectoryPath,
              );
              await repositoryFilesystem.getEntryStats('some-directory');

              const stats = await repositoryFilesystem.getEntryStats(
                'some-directory',
              );

              expect(stats).toHaveProperty('atime');
              expect(stats).toHaveProperty('ctime');
              expect(stats).toHaveProperty('mtime');
            },
          );
        });
      });
    });
  });
});
