import { directoryExists } from '@metamask/utils/node';
import path from 'path';

import { ensureMetaMaskRepositoriesLoaded } from './ensure-metamask-repositories-loaded';

/**
 * What we know about the target of a repository reference.
 */
type ResolvedRepository = {
  shortname: string;
  directoryPath: string;
  exists: boolean;
  createdAutomatically: boolean;
};

/**
 * A "repository reference" may be:
 *
 * A. The path of an existing repository relative to this tool's working
 * directory.
 * B. The absolute path of an existing repository.
 * C. The "short name" of a MetaMask repository (that is, without "MetaMask/" or
 * any other qualifiers), which has either already been cloned or should be
 * cloned.
 *
 * This function determines the nature of the reference, verifies that the
 * directory is a Git repository, and then returns what it knows:
 *
 * - The "short name" of the repository.
 * - The path to the directory.
 * - Whether that path exists.
 * - Whether the directory was or will be created automatically by this tool.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryReference - Either the name of a MetaMask repository,
 * such as "utils", or the path to a local Git repository.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @returns Information about the repository being referred to.
 * @throws If given something that is not the name of a MetaMask repository or
 * the path of an existing repository.
 */
export async function resolveRepositoryReference({
  repositoryReference,
  workingDirectoryPath,
  cachedRepositoriesDirectoryPath,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
}): Promise<ResolvedRepository> {
  let resolvedRepositoryFromExistingPath: ResolvedRepository | undefined;
  let resolvedRepositoryFromName: ResolvedRepository | undefined;

  const possibleRealDirectoryPath = path.resolve(
    workingDirectoryPath,
    repositoryReference,
  );
  if (await directoryExists(possibleRealDirectoryPath)) {
    resolvedRepositoryFromExistingPath = {
      shortname: path.basename(possibleRealDirectoryPath),
      directoryPath: possibleRealDirectoryPath,
      exists: true,
      createdAutomatically: false,
    };
  }

  if (!resolvedRepositoryFromExistingPath) {
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
      resolvedRepositoryFromName = {
        shortname: repositoryReference,
        directoryPath: cachedRepositoryDirectoryPath,
        exists: cachedRepositoryExists,
        createdAutomatically: isKnownMetaMaskRepository,
      };
    }
  }

  const resolvedRepository =
    resolvedRepositoryFromExistingPath ?? resolvedRepositoryFromName;

  if (!resolvedRepository) {
    throw new Error(
      `Could not resolve '${repositoryReference}' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
    );
  }

  const isGitRepository = await directoryExists(
    path.join(resolvedRepository.directoryPath, '.git'),
  );

  if (resolvedRepository.exists && !isGitRepository) {
    throw new Error(
      `"${resolvedRepository.directoryPath}" is not a Git repository, cannot proceed.`,
    );
  }

  return resolvedRepository;
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
