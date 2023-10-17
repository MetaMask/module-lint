import { readJsonFile, writeJsonFile } from '@metamask/utils/node';
import path from 'path';

import { fetchOrPopulateFileCache } from './fetch-or-populate-file-cache';
import { withinSandbox, fakeDateOnly } from '../tests/helpers';

describe('fetchOrPopulateFileCache', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('if the given file does not already exist', () => {
    it('saves the return value of the given function in the file as JSON along with its created time', async () => {
      jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const filePath = path.join(sandboxDirectoryPath, 'cache');
        const data = { foo: 'bar' };

        await fetchOrPopulateFileCache({
          filePath,
          getDataToCache: () => data,
        });

        const cache = await readJsonFile(filePath);
        expect(cache).toStrictEqual({
          ctime: '2023-01-01T00:00:00.000Z',
          data,
        });
      });
    });

    it('returns the data that was cached', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const filePath = path.join(sandboxDirectoryPath, 'cache');
        const dataToCache = { foo: 'bar' };

        const cachedData = await fetchOrPopulateFileCache({
          filePath,
          getDataToCache: () => dataToCache,
        });

        expect(cachedData).toStrictEqual(dataToCache);
      });
    });
  });

  describe('if the given file already exists', () => {
    describe('and no explicit max age is given', () => {
      describe('and it was created less than an hour ago', () => {
        it('does not overwrite the cache', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const data = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:30:00Z').toISOString(),
                data,
              });

              await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => data,
              });

              const cache = await readJsonFile(filePath);
              expect(cache).toStrictEqual({
                ctime: '2023-01-01T00:30:00.000Z',
                data,
              });
            },
          );
        });

        it('returns the data in the file', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const data = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:30:00Z').toISOString(),
                data,
              });

              const cachedData = await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => data,
              });

              expect(cachedData).toStrictEqual(data);
            },
          );
        });
      });

      describe('and it was created more than an hour ago', () => {
        it('overwrites the cache', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const dataToCache = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T01:00:01Z').toISOString(),
                data: dataToCache,
              });

              await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => dataToCache,
              });

              const cache = await readJsonFile(filePath);
              expect(cache).toStrictEqual({
                ctime: '2023-01-01T01:00:01.000Z',
                data: dataToCache,
              });
            },
          );
        });

        it('returns the data in the file', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const dataToCache = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T01:00:01Z').toISOString(),
                data: dataToCache,
              });

              const cachedData = await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => dataToCache,
              });

              expect(cachedData).toStrictEqual(dataToCache);
            },
          );
        });
      });
    });

    describe('and a max age is given', () => {
      describe('and it was created less than <max age> seconds ago', () => {
        it('does not overwrite the cache', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const data = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:00:04Z').toISOString(),
                data,
              });

              await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => data,
                maxAge: 5000,
              });

              const cache = await readJsonFile(filePath);
              expect(cache).toStrictEqual({
                ctime: '2023-01-01T00:00:04.000Z',
                data,
              });
            },
          );
        });

        it('returns the data in the file', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const data = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:00:04Z').toISOString(),
                data,
              });

              const cachedData = await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => data,
                maxAge: 5000,
              });

              expect(cachedData).toStrictEqual(data);
            },
          );
        });
      });

      describe('and it was created more than an hour ago', () => {
        it('overwrites the cache', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const dataToCache = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:00:06Z').toISOString(),
                data: dataToCache,
              });

              await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => dataToCache,
                maxAge: 5000,
              });

              const cache = await readJsonFile(filePath);
              expect(cache).toStrictEqual({
                ctime: '2023-01-01T00:00:06.000Z',
                data: dataToCache,
              });
            },
          );
        });

        it('returns the data in the file', async () => {
          jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));

          await withinSandbox(
            async ({ directoryPath: sandboxDirectoryPath }) => {
              const filePath = path.join(sandboxDirectoryPath, 'cache');
              const dataToCache = { foo: 'bar' };
              await writeJsonFile(filePath, {
                ctime: new Date('2023-01-01T00:00:06Z').toISOString(),
                data: dataToCache,
              });

              const cachedData = await fetchOrPopulateFileCache({
                filePath,
                getDataToCache: () => dataToCache,
                maxAge: 5000,
              });

              expect(cachedData).toStrictEqual(dataToCache);
            },
          );
        });
      });
    });
  });
});
