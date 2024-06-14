import { StructError, assert } from '@metamask/superstruct';
import type { Struct, ObjectSchema } from '@metamask/superstruct';
import {
  isErrorWithCode,
  wrapError as originalWrapError,
} from '@metamask/utils/node';
import type { Json } from '@metamask/utils/node';
import fs from 'fs';
import path from 'path';

/**
 * Represents a directory entry. Like fs.Dirent, but includes two additional
 * properties, `absolutePath` and `relativePath`, where `relativePath` is the
 * path relative to its parent directory.
 */
export type DirectoryEntry = fs.Dirent & {
  absolutePath: string;
  relativePath: string;
};

/**
 * The error code used when a JSON file does not conform to a Superstruct
 * schema.
 */
const INVALID_JSON_FILE_ERROR_CODE = 'ERR_INVALID_JSON_FILE';

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
    return await fs.promises.stat(entryPath);
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
 * Asserts that the given object matches the shape outlined by the given
 * Superstruct struct.
 *
 * @param object - The object to check.
 * @param struct - The Superstruct object struct that you want to match against
 * the object.
 */
export function assertJsonMatchesStruct<
  Value extends Json,
  Schema extends ObjectSchema,
>(object: Json, struct: Struct<Value, Schema>): asserts object is Value {
  try {
    assert(object, struct);
  } catch (error) {
    if (error instanceof StructError) {
      const failureMessages = error
        .failures()
        .map((failure) => {
          return failure.message.endsWith('but received: undefined')
            ? `Missing \`${String(failure.key)}\``
            : `Invalid \`${String(failure.key)}\` (${failure.message})`;
        })
        .join('; ');

      throw wrapError(
        error,
        `${failureMessages}.`,
        INVALID_JSON_FILE_ERROR_CODE,
      );
    }
    throw error;
  }
}

/**
 * Read the directory at the given path, and any directories underneath it, to
 * arrive at all of the non-directories underneath that directory recursively.
 *
 * TODO: Move to @metamask/utils.
 *
 * @param directoryPath - The path to the directory.
 * @param rootDirectoryPath - The path to another directory that will be used as
 * the base for calculating relative paths for all entries. Defaults to
 * `directoryPath`.
 * @returns Objects representing all files underneath the directory.
 * @throws An error with a stack trace if reading fails in any way.
 */
export async function readDirectoryRecursively(
  directoryPath: string,
  rootDirectoryPath = directoryPath,
): Promise<DirectoryEntry[]> {
  try {
    const dirents = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });
    const groupsOfChildEntries = await Promise.all(
      dirents.map(async (dirent) => {
        const absolutePath = path.join(directoryPath, dirent.name);

        if (dirent.isDirectory()) {
          return await readDirectoryRecursively(
            absolutePath,
            rootDirectoryPath,
          );
        }

        const entry: DirectoryEntry = Object.assign({}, dirent, {
          absolutePath,
          relativePath: path.relative(rootDirectoryPath, absolutePath),
        });
        return [entry];
      }),
    );
    return groupsOfChildEntries.flat();
  } catch (error) {
    throw wrapError(error, `Could not read directory '${directoryPath}'`);
  }
}

/**
 * Builds a new error object, linking it to the original error via the `cause`
 * property if it is an Error.
 *
 * This is different from the `@metamask/utils` version because it allows for
 * customizing the error code.
 *
 * @param originalError - The error to be wrapped (something throwable).
 * @param message - The desired message of the new error.
 * @param code - A code to add to the error.
 * @returns A new error object.
 */
export function wrapError<Throwable>(
  originalError: Throwable,
  message: string,
  code?: string,
): Error & { code?: string } {
  const error = originalWrapError(originalError, message);

  if (code !== undefined) {
    error.code = code;
  }

  return error;
}

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
