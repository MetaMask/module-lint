import { readFile } from '@metamask/utils/node';
import type fs from 'fs';
import path from 'path';

import { getEntryStats } from './misc-utils';

/**
 * Used to access files within either a project (the repository being linted) or
 * a template (the repository that the project is compared to). Any filesystem
 * operation performed is cached to make rule execution for the same project or
 * template as fast as possible.
 */
export class RepositoryFilesystem {
  #directoryPath: string;

  #fileContents: Record<string, string>;

  #entryStats: Record<string, fs.Stats | null>;

  /**
   * Constructs a RepositoryFilesystem.
   *
   * @param directoryPath - The path to the repository.
   */
  constructor(directoryPath: string) {
    this.#directoryPath = directoryPath;
    this.#fileContents = {};
    this.#entryStats = {};
  }

  /**
   * Reads a file within the repository.
   *
   * @param filePath - The path to the file within the context of the repository
   * (so, minus its directory).
   * @returns The contents of the file.
   */
  async readFile(filePath: string): Promise<string> {
    const cachedContent = this.#fileContents[filePath];
    const content =
      cachedContent ?? (await readFile(this.#getFullPath(filePath))).trim();
    this.#fileContents[filePath] = content;
    return content;
  }

  /**
   * Retrieves stats for the given file or directory.
   *
   * @param entryPath - The path to the file or directory within the context of
   * the repository (so, minus its directory).
   * @returns The `fs.Stats` object with information about the entry.
   */
  async getEntryStats(entryPath: string): Promise<fs.Stats | null> {
    const cachedStats = this.#entryStats[entryPath];
    const stats =
      cachedStats ?? (await getEntryStats(this.#getFullPath(entryPath)));
    this.#entryStats[entryPath] = stats;
    return stats;
  }

  /**
   * Builds the full path to a file or directory within the repository from a
   * partial path.
   *
   * @param entryPath - The path to the file or directory within the context of
   * the repository (so, minus its directory).
   * @returns The full path.
   */
  #getFullPath(entryPath: string): string {
    return path.join(this.#directoryPath, entryPath);
  }
}
