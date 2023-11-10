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
 * 1. The path of an existing directory relative to this tool's working
 * directory.
 * 2. The absolute path of an existing directory.
 * 3. The path to a previously cloned MetaMask repository.
 * 4. The name of a MetaMask repository.
 *
 * This function determines which one it is.
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
