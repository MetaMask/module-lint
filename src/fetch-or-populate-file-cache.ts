import type { Json } from '@metamask/utils/node';
import { fileExists, readJsonFile, writeJsonFile } from '@metamask/utils/node';

import { ONE_HOUR } from './constants';
import { logger } from './logging-utils';

/**
 * The data stored in the cache file.
 */
type FileCache<Data extends Json> = {
  /**
   * When the data was stored.
   */
  ctime: string;
  /**
   * The cached data.
   */
  data: Data;
};

/**
 * How long to cache data retrieved from an API (to prevent rate limiting).
 *
 * Equal to 1 hour.
 */
const DEFAULT_MAX_AGE = ONE_HOUR;

/**
 * Avoids rate limits when making requests to an API by consulting a file cache.
 *
 * Reads the given cache file and returns the data within it if it exists and is
 * fresh enough; otherwise runs the given function and saves its return value to
 * the file.
 *
 * @param args - The arguments to this function.
 * @param args.filePath - The path to the file where the data should be saved.
 * @param args.getDataToCache - A function to get the data that should be cached
 * if the cache does not exist or is stale.
 * @param args.maxAge - The amount of time (in milliseconds) that the cache is
 * considered "fresh". Affects subsequent calls: if `fetchOrPopulateFileCache`
 * is called again with the same file path within the duration specified here,
 * `getDataToCache` will not get called again, otherwise it will. Defaults to 1
 * hour.
 */
export async function fetchOrPopulateFileCache<Data extends Json>({
  filePath,
  maxAge = DEFAULT_MAX_AGE,
  getDataToCache,
}: {
  filePath: string;
  maxAge?: number;
  getDataToCache: () => Data | Promise<Data>;
}): Promise<Data> {
  const now = new Date();

  if (await fileExists(filePath)) {
    const cache = await readJsonFile<FileCache<Data>>(filePath);
    const createdDate = new Date(cache.ctime);

    if (now.getTime() - createdDate.getTime() <= maxAge) {
      logger.debug(`Reusing fresh cached data under ${filePath}`);
      return cache.data;
    }
  }

  logger.debug(
    `Cache does not exist or is stale; preparing data to write to ${filePath}`,
  );
  const dataToCache = await getDataToCache();
  await writeJsonFile(filePath, {
    ctime: now.toISOString(),
    data: dataToCache,
  });
  return dataToCache;
}
