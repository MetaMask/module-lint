import { directoryExists } from '@metamask/utils/node';
import path from 'path';

import { ensureMetaMaskRepositoriesLoaded } from './ensure-metamask-repositories-loaded';
import { createModuleLogger, projectLogger } from './logging-utils';

const log = createModuleLogger(projectLogger, 'resolve-repository-reference');

type ResolvedRepositoryReference = {
  repositoryShortname: string;
  repositoryDirectoryPath: string;
  repositoryDirectoryExists: boolean;
  isKnownMetaMaskRepository: boolean;
};

/**
 * A "repository reference" may be:
 *
 * A. The path of an existing directory relative to this tool's working
 * directory.
 * B. The absolute path of an existing directory.
 * C. The "short name" of a MetaMask repository (that is, without "MetaMask/" or
 * any other qualifiers), which has either already been cloned or should be
 * cloned.
 *
 * This function first establishes the location of the repository in question.
 * Its parent directory is either the working directory, the cached repositories
 * directory, or some other location, and the name of the directory itself is
 * the "short name".
 *
 * Once the directory path is determined, this function merely returns metadata
 * about that directory:
 *
 * - Whether the directory exists yet.
 * - The path to the directory.
 * - The "short name" of the repository.
 * - Whether the repository is or will represent a non-fork, non-archived
 * MetaMask repository.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryReference - Either the name of a MetaMask repository,
 * such as "utils", or the path to a local Git repository.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @returns Information about the repository being referred to.
 * @throws If given a repository reference that cannot be resolved to the name
 * of a MetaMask repository or a local directory.
 */
export async function resolveRepositoryReference({
  repositoryReference,
  workingDirectoryPath,
  cachedRepositoriesDirectoryPath,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
}): Promise<ResolvedRepositoryReference> {
  const possibleRealDirectoryPath = path.resolve(
    workingDirectoryPath,
    repositoryReference,
  );
  if (await directoryExists(possibleRealDirectoryPath)) {
    return {
      repositoryShortname: path.basename(possibleRealDirectoryPath),
      repositoryDirectoryPath: possibleRealDirectoryPath,
      repositoryDirectoryExists: true,
      isKnownMetaMaskRepository: false,
    };
  }

  const cachedRepositoryDirectoryPath = path.join(
    cachedRepositoriesDirectoryPath,
    repositoryReference,
  );
  const cachedRepositoryExists = await directoryExists(
    cachedRepositoryDirectoryPath,
  );
  const isKnownMetaMaskRepository = await isValidMetaMaskRepositoryName(
    repositoryReference,
  );

  if (cachedRepositoryExists || isKnownMetaMaskRepository) {
    return {
      repositoryShortname: repositoryReference,
      repositoryDirectoryPath: cachedRepositoryDirectoryPath,
      repositoryDirectoryExists: cachedRepositoryExists,
      isKnownMetaMaskRepository,
    };
  }

  log(
    'possibleRealDirectoryPath',
    possibleRealDirectoryPath,
    'cachedRepositoryDirectoryPath',
    cachedRepositoryDirectoryPath,
    'cachedRepositoryExists',
    cachedRepositoryExists,
  );

  throw new Error(
    `Could not resolve '${repositoryReference}' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
  );
}

/**
 * Determines whether the given string matches a known repository under the
 * MetaMask GitHub organization.
 *
 * @param repositoryName - The name of the repository to check.
 */
export async function isValidMetaMaskRepositoryName(repositoryName: string) {
  const metaMaskRepositories = await ensureMetaMaskRepositoriesLoaded();
  return metaMaskRepositories.some(
    (repository) =>
      !repository.fork &&
      !repository.archived &&
      repository.name === repositoryName,
  );
}
