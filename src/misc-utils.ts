import { isErrorWithCode, wrapError } from '@metamask/utils/node';
import type fs from 'fs';
import * as fsPromises from 'fs/promises';

/**
 * Builds a string by repeating the same character some number of times.
 *
 * @param character - The character.
 * @param length - The number of times to repeat the character.
 * @returns The resulting string.
 */
export function repeat(character: string, length: number): string {
  let string = '';
  for (let i = 0; i < length; i++) {
    string += character;
  }
  return string;
}

/**
 * Applies indentation to the given text.
 *
 * @param text - The text to indent.
 * @param level - The indentation level to apply (one level is two spaces).
 * @returns The indented string.
 */
export function indent(text: string, level: number) {
  const indentation = repeat(' ', level * 2);
  return `${indentation}${text}`;
}

/**
 * Parses the "Link" header in the response of a GitHub REST API request.
 *
 * @param header - The header value.
 * @returns An object version of the data contained in the header.
 * @see {@link https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api}
 */
export function parseGithubApiLinkHeader(
  header: string,
): Partial<Record<'first' | 'prev' | 'next' | 'last', string>> {
  return header
    .split(/,\s*/u)
    .reduce<[string, string][]>((array, part) => {
      const taggedUrl = part.split(/;\s*/u, 2);
      const [enclosedUrl, taggedProperty] =
        taggedUrl.length === 2
          ? taggedUrl
          : /* istanbul ignore next: taggedProperty is always a string */ [
              null,
              null,
            ];
      if (!enclosedUrl || !taggedProperty) {
        return array;
      }
      const tag = taggedProperty.split('=', 2);
      const [, quotedProperty] =
        tag.length === 2
          ? tag
          : /* istanbul ignore next: quotedProperty is always a string */ [
              null,
              null,
            ];
      if (!quotedProperty) {
        return array;
      }
      const property = quotedProperty.replace(/^"?([^"]+)"?$/u, '$1');
      const url = enclosedUrl.replace(/^<?([^<>]+)>?$/u, '$1');
      return array.concat([[property, url]]);
    }, [])
    .reduce((obj, [property, url]) => {
      return { ...obj, [property]: url };
    }, {});
}

/**
 * Retrieves information about the file or directory using `fs.stat`.
 *
 * @param entryPath - The path to the file or directory.
 * @returns The stats for the file or directory if it exists, or null if it does
 * not exist.
 * @throws An error with a stack trace if reading fails in any way.
 */
export async function getEntryStats(
  entryPath: string,
): Promise<fs.Stats | null> {
  try {
    return await fsPromises.stat(entryPath);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === 'ENOENT') {
      return null;
    }
    throw wrapError(
      error,
      `Could not get stats for file or directory '${entryPath}'`,
    );
  }
}

/**
 * Type guard for a fulfilled promise result obtained via `Promise.allSettled`.
 *
 * @param promiseSettledResult - The promise settled result.
 * @returns True if the result is fulfilled, false otherwise.
 */
export function isPromiseFulfilledResult<Value>(
  promiseSettledResult: PromiseSettledResult<Value>,
): promiseSettledResult is PromiseFulfilledResult<Value> {
  return promiseSettledResult.status === 'fulfilled';
}

/**
 * Type guard for a rejected promise result obtained via `Promise.allSettled`.
 *
 * @param promiseSettledResult - The promise settled result.
 * @returns True if the result is rejected, false otherwise.
 */
export function isPromiseRejectedResult<Value>(
  promiseSettledResult: PromiseSettledResult<Value>,
): promiseSettledResult is PromiseRejectedResult {
  return promiseSettledResult.status === 'rejected';
}
