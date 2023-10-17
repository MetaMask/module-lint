import type { Json } from '@metamask/utils/node';
import {
  ensureDirectoryStructureExists,
  readFile,
  readJsonFile,
  writeFile,
  writeJsonFile,
} from '@metamask/utils/node';
import path from 'path';

/**
 * Simulates an independently located and published library.
 */
export default class FakePackage {
  /**
   * The directory containing the package.
   */
  directoryPath: string;

  /**
   * Constructs a FakePackage instance. The directory that holds the package is
   * assumed to exist already.
   *
   * @param args - The arguments to the constructor.
   * @param args.directoryPath - The directory containing the package.
   */
  constructor({ directoryPath }: { directoryPath: string }) {
    this.directoryPath = directoryPath;
  }

  /**
   * Reads the contents of a file within the package that is expected to hold
   * JSON data, with JSON deserialization/serialization handled automatically.
   *
   * @param partialFilePath - The path to the file, omitting the path to the
   * package directory.
   * @returns The data within the file as a proper JavaScript object.
   */
  async readJsonFile(
    partialFilePath: string,
  ): Promise<Record<string, unknown>> {
    return JSON.parse(await readJsonFile(this.#pathTo(partialFilePath)));
  }

  /**
   * Reads the contents of a file within the package.
   *
   * @param partialFilePath - The path to the file, omitting the path to the
   * package directory.
   * @returns The contents of the file.
   */
  async readFile(partialFilePath: string): Promise<string> {
    return await readFile(this.#pathTo(partialFilePath));
  }

  /**
   * Creates or overwrites a file within the package that is expected to hold
   * JSON data, with JSON deserialization/serialization handled automatically.
   *
   * @param partialFilePath - The path to the file, omitting the path to the
   * package directory.
   * @param object - The new object that the file should represent.
   */
  async writeJsonFile(partialFilePath: string, object: Json): Promise<void> {
    await writeJsonFile(this.#pathTo(partialFilePath), object);
  }

  /**
   * Creates or overwrites a file within the package. If the directory where the
   * file is located does not exist, it will be created.
   *
   * @param partialFilePath - The path to the file, omitting the path to the
   * package directory.
   * @param contents - The desired contents of the file.
   */
  async writeFile(partialFilePath: string, contents: string): Promise<void> {
    await writeFile(this.#pathTo(partialFilePath), contents);
  }

  /**
   * Creates a directory within the package. If the directory already exists,
   * this function does nothing.
   *
   * @param partialDirectoryPath - The path to the desired directory.
   */
  async createDirectory(partialDirectoryPath: string): Promise<void> {
    return await ensureDirectoryStructureExists(
      this.#pathTo(partialDirectoryPath),
    );
  }

  /**
   * Constructs the path of a file or directory within the package.
   *
   * @param partialEntryPath - The path to the file or directory, omitting the
   * path to the package directory.
   * @returns The full path to the file or directory.
   */
  #pathTo(partialEntryPath: string): string {
    return path.resolve(this.directoryPath, partialEntryPath);
  }
}
