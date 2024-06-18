import type { Struct, ObjectSchema } from '@metamask/superstruct';
import type { Json } from '@metamask/utils/node';
import { readFile, readJsonFile } from '@metamask/utils/node';
import type fs from 'fs';
import path from 'path';
import { parse as yamlParse } from 'yaml';

import type { DirectoryEntry } from './misc-utils';
import {
  assertJsonMatchesStruct,
  getEntryStats,
  readDirectoryRecursively,
} from './misc-utils';

/**
 * Used to access files within either a project (the repository being linted) or
 * a template (the repository that the project is compared to). Any filesystem
 * operation performed is cached to make rule execution for the same project or
 * template as fast as possible.
 */
export class RepositoryFilesystem {
  #directoryPath: string;

  #fileContents: Record<string, string>;

  #jsonFileContents: Record<string, Json>;

  #entryStats: Record<string, fs.Stats | null>;

  /**
   * Constructs a RepositoryFilesystem.
   *
   * @param directoryPath - The path to the repository.
   */
  constructor(directoryPath: string) {
    this.#directoryPath = directoryPath;
    this.#fileContents = {};
    this.#jsonFileContents = {};
    this.#entryStats = {};
  }

  /**
   * Reads a file within the repository.
   *
   * @param filePath - The path to the file relative to the repository root.
   * @returns The contents of the file.
   */
  async readFile(filePath: string): Promise<string> {
    const cachedContent = this.#fileContents[filePath];
    const content =
      cachedContent ?? (await readFile(this.#getFullPath(filePath)));
    this.#fileContents[filePath] = content;
    return content;
  }

  /**
   * Reads a JSON file within the repository.
   *
   * @param filePath - The path to the file relative to the repository root.
   * @returns The contents of the file as a JSON object.
   */
  async readJsonFile(filePath: string): Promise<Json> {
    const cachedContent = this.#jsonFileContents[filePath];
    const fullPath = this.#getFullPath(filePath);
    const content = cachedContent ?? (await readJsonFile(fullPath));
    this.#jsonFileContents[filePath] = content;
    return content;
  }

  /**
   * Reads a JSON file within the repository, ensuring that it matches the
   * given Superstruct struct.
   *
   * @param filePath - The path to the file relative to the repository root.
   * @param struct - The Superstruct object struct that you want to match
   * against the content of the file.
   * @returns The contents of the file as a JSON object.
   */
  async readJsonFileAs<Value extends Json, Schema extends ObjectSchema>(
    filePath: string,
    struct: Struct<Value, Schema>,
  ): Promise<Value> {
    const content = await this.readJsonFile(filePath);
    assertJsonMatchesStruct(content, struct);
    return content;
  }

  /**
   * Reads a YAML file within the repository, ensuring that it matches the
   * given Superstruct struct.
   *
   * @param filePath - The path to the file relative to the repository root.
   * @param struct - The Superstruct object struct that you want to match
   * against the content of the file.
   * @returns The contents of the file as a JSON object.
   */
  async readYamlFileAs<Value extends Json, Schema extends ObjectSchema>(
    filePath: string,
    struct: Struct<Value, Schema>,
  ): Promise<Value> {
    const content = await this.readFile(filePath);
    const parsedYaml = yamlParse(content);
    assertJsonMatchesStruct(parsedYaml, struct);
    return parsedYaml;
  }

  /**
   * Reads a directory recursively within the repository.
   *
   * @param directoryPath - The path to the directory relative to the repository
   * root.
   * @returns Objects representing the entries in the directory.
   */
  async readDirectoryRecursively(
    directoryPath: string,
  ): Promise<DirectoryEntry[]> {
    return await readDirectoryRecursively(
      this.#getFullPath(directoryPath),
      this.#directoryPath,
    );
  }

  /**
   * Retrieves stats for the given file or directory.
   *
   * @param entryPath - The path to the file relative to the repository root.
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
   * path relative to the root directory of the repository.
   *
   * @param entryPath - The path to the file relative to the repository root.
   * @returns The full path.
   */
  #getFullPath(entryPath: string): string {
    return path.resolve(this.#directoryPath, entryPath);
  }
}
