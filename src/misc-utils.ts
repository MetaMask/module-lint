import { isErrorWithCode, wrapError } from '@metamask/utils/node';
import type fs from 'fs';
import * as fsPromises from 'fs/promises';

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
