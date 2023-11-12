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
 * Applies indentation to the given text.
 *
 * @param text - The text to indent.
 * @param level - The indentation level to apply (one level is two spaces).
 * @returns The indented string.
 */
export function indent(text: string, level: number) {
  let indentation = '';
  for (let i = 0; i < level * 2; i++) {
    indentation += ' ';
  }
  return `${indentation}${text}`;
}
