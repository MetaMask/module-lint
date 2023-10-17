import {
  directoryExists,
  ensureDirectoryStructureExists,
} from '@metamask/utils/node';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { ONE_HOUR } from './constants';
import { ensureMetaMaskRepositoriesLoaded } from './ensure-metamask-repositories-loaded';
import { logger } from './logging-utils';
import { getEntryStats } from './misc-utils';
import type { OutputLogger } from './output-logger';
import { RepositoryFilesystem } from './repository-filesystem';

/**
 * Information about a Git branch.
 */
type BranchInfo = {
  currentBranchName: string;
  defaultBranchName: string;
  lastFetchedDate: Date | null;
};

/**
 * A repository within the MetaMask organization on GitHub which has been cloned
 * to the local filesystem. More concretely, this could either be a template or
 * a project that requires linting.
 */
export type MetaMaskRepository = BranchInfo & {
  shortname: string;
  directoryPath: string;
  fs: RepositoryFilesystem;
};

/**
 * Information about a repository we know exists on the filesystem.
 */
type ExistingRepository = BranchInfo & {
  shortname: string;
  directoryPath: string;
  isKnownMetaMaskRepository: boolean;
};

/**
 * Ensures that there is a proper repository to lint. A repository may be one of
 * two things: either A) the "short name" of a known repository under the GitHub
 * MetaMask organization, or B) the path to a directory on the local filesystem.
 * In the case of a MetaMask repository, this function takes care of
 * automatically cloning the repository to a temporary location (unless it has
 * already been cloned), then bringing the repository up to date with its
 * default branch.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryReference - Either the name of a MetaMask repository,
 * such as "utils", or the path to a local Git repository.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns The repository.
 */
export async function establishMetaMaskRepository({
  repositoryReference,
  workingDirectoryPath,
  validRepositoriesCachePath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  validRepositoriesCachePath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: OutputLogger;
}): Promise<MetaMaskRepository> {
  const existingRepository = await ensureRepositoryExists({
    repositoryReference,
    workingDirectoryPath,
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });
  logger.debug('Repository is', existingRepository.shortname);

  const repositoryFilesystem = new RepositoryFilesystem(
    existingRepository.directoryPath,
  );

  if (existingRepository.isKnownMetaMaskRepository) {
    await requireDefaultBranchSelected(existingRepository);

    const updatedLastFetchedDate = await ensureDefaultBranchIsUpToDate(
      existingRepository,
    );
    return {
      ...existingRepository,
      lastFetchedDate: updatedLastFetchedDate,
      fs: repositoryFilesystem,
    };
  }

  return {
    ...existingRepository,
    fs: repositoryFilesystem,
  };
}

/**
 * Ensures that a lintable repository exists. If given the path to a local Git
 * repository, then nothing really happens. If given the name of a MetaMask
 * repository, then it is cloned if it has not already been cloned. Either way,
 * this function collects information about the repository which is useful for
 * bringing it up to date later if need be.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryReference - Either the name of a MetaMask repository,
 * such as "utils", or the path to a local Git repository.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns Information about the repository.
 * @throws If given a repository reference that cannot be resolved to the name
 * of a MetaMask repository or a local directory, or if the resolved directory
 * is not a Git repository.
 */
async function ensureRepositoryExists({
  repositoryReference,
  workingDirectoryPath,
  validRepositoriesCachePath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  validRepositoriesCachePath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: OutputLogger;
}): Promise<ExistingRepository> {
  const {
    repositoryShortname,
    repositoryDirectoryPath,
    repositoryDirectoryExists,
    isKnownMetaMaskRepository,
  } = await resolveRepositoryReference({
    repositoryReference,
    workingDirectoryPath,
    cachedRepositoriesDirectoryPath,
    validRepositoriesCachePath,
  });
  const isGitRepository = await directoryExists(
    path.join(repositoryDirectoryPath, '.git'),
  );

  if (repositoryDirectoryExists && !isGitRepository) {
    throw new Error(
      `${repositoryDirectoryPath} is not a Git repository, cannot proceed.`,
    );
  }

  const branchInfo = isGitRepository
    ? await getBranchInfo({ repositoryDirectoryPath })
    : await cloneRepository({
        repositoryShortname,
        repositoryDirectoryPath,
        cachedRepositoriesDirectoryPath,
        outputLogger,
      });

  return {
    ...branchInfo,
    shortname: repositoryShortname,
    directoryPath: repositoryDirectoryPath,
    isKnownMetaMaskRepository,
  };
}

/**
 * Collects the current and default branch name of the given repository as well
 * as the time when commits were last fetched.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryDirectoryPath - The path to the repository.
 */
async function getBranchInfo({
  repositoryDirectoryPath,
}: {
  repositoryDirectoryPath: string;
}): Promise<BranchInfo> {
  logger.debug(
    'Repository has been cloned already to',
    repositoryDirectoryPath,
  );
  const currentBranchName = await getCurrentBranchName({
    repositoryDirectoryPath,
  });
  const defaultBranchName = await getDefaultBranchName({
    repositoryDirectoryPath,
  });
  const lastFetchedDate = await getLastFetchedDate({
    repositoryDirectoryPath,
  });
  return {
    currentBranchName,
    defaultBranchName,
    lastFetchedDate,
  };
}

/**
 * Clones a MetaMask repository using the `gh` tool.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryShortname - The name of the repository minus the
 * organization (so, "utils" instead of "MetaMask/utils").
 * @param args.repositoryDirectoryPath - The path where the repository should be
 * cloned to.
 * @param args.cachedRepositoriesDirectoryPath - The parent directory in which
 * to keep the new repository.
 * @param args.outputLogger - Writable streams for output messages.
 * @throws If `repositoryDirectoryPath` is not within
 * `cachedRepositoriesDirectoryPath`, or you do not have `gh` installed.
 */
async function cloneRepository({
  repositoryShortname,
  repositoryDirectoryPath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  repositoryShortname: string;
  repositoryDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: OutputLogger;
}) {
  /* istanbul ignore next: There's no way to reproduce this; this is just to be absolutely sure */
  if (
    path.dirname(repositoryDirectoryPath) !== cachedRepositoriesDirectoryPath
  ) {
    throw new Error(
      'You seem to be pointing to a directory outside the cached repositories directory. Refusing to proceed to avoid data loss.',
    );
  }

  logger.debug(
    'Assuming',
    repositoryShortname,
    'is the name of a MetaMask repo',
  );

  logger.debug('Removing existing', repositoryDirectoryPath);
  await fs.promises.rm(repositoryDirectoryPath, {
    recursive: true,
    force: true,
  });

  logger.debug('Cloning', repositoryShortname, 'to', repositoryDirectoryPath);
  outputLogger.logToStderr(
    `Cloning repository MetaMask/${repositoryShortname}, please wait...`,
  );
  await ensureDirectoryStructureExists(cachedRepositoriesDirectoryPath);
  // NOTE: This requires that you have `gh` installed locally
  await execa('gh', [
    'repo',
    'clone',
    `MetaMask/${repositoryShortname}`,
    repositoryDirectoryPath,
  ]);
  const currentBranchName = await getCurrentBranchName({
    repositoryDirectoryPath,
  });
  const defaultBranchName = currentBranchName;

  return {
    currentBranchName,
    defaultBranchName,
    lastFetchedDate: new Date(),
  };
}

/**
 * Determines whether the given string matches a known repository under the
 * MetaMask GitHub organization.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryName - The name of the repository to check.
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 */
export async function isValidMetaMaskRepositoryName({
  repositoryName,
  validRepositoriesCachePath,
}: {
  repositoryName: string;
  validRepositoriesCachePath: string;
}) {
  const metaMaskRepositories = await ensureMetaMaskRepositoriesLoaded({
    validRepositoriesCachePath,
  });
  return metaMaskRepositories.some(
    (repository) =>
      !repository.fork &&
      !repository.archived &&
      repository.name === repositoryName,
  );
}

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
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @returns Information about the repository being referred to.
 * @throws If given a repository reference that cannot be resolved to the name
 * of a MetaMask repository or a local directory.
 */
async function resolveRepositoryReference({
  repositoryReference,
  workingDirectoryPath,
  cachedRepositoriesDirectoryPath,
  validRepositoriesCachePath,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
  validRepositoriesCachePath: string;
}) {
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
  const isKnownMetaMaskRepository = await isValidMetaMaskRepositoryName({
    repositoryName: repositoryReference,
    validRepositoriesCachePath,
  });

  if (cachedRepositoryExists || isKnownMetaMaskRepository) {
    return {
      repositoryShortname: repositoryReference,
      repositoryDirectoryPath: cachedRepositoryDirectoryPath,
      repositoryDirectoryExists: cachedRepositoryExists,
      isKnownMetaMaskRepository,
    };
  }

  logger.debug(
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
 * Retrieves the default branch of the given repository, that is, the branch
 * that represents the main line of development. Unfortunately there's no good
 * way to obtain this, so this function just tries "main" followed by "master".
 *
 * @param args - The arguments to this function.
 * @param args.repositoryDirectoryPath - The path to the repository.
 * @returns The default branch name.
 * @throws If neither "main" nor "master" exist.
 */
async function getDefaultBranchName({
  repositoryDirectoryPath,
}: {
  repositoryDirectoryPath: string;
}): Promise<string> {
  try {
    logger.debug('Running: git rev-parse --verify --quiet main');
    await execa('git', ['rev-parse', '--verify', '--quiet', 'main'], {
      cwd: repositoryDirectoryPath,
    });
    return 'main';
  } catch (error) {
    logger.debug(
      'Command `git rev-parse --verify --quiet main` failed:',
      error,
    );
  }

  try {
    logger.debug('Running: git rev-parse --verify --quiet master');
    await execa('git', ['rev-parse', '--verify', '--quiet', 'master'], {
      cwd: repositoryDirectoryPath,
    });
    return 'master';
  } catch (error) {
    logger.debug(
      'Command `git rev-parse --verify --quiet master` failed:',
      error,
    );
  }

  throw new Error(
    `Could not detect default branch name for ${repositoryDirectoryPath}.`,
  );
}

/**
 * Retrieves the date/time that any commits were last fetched for the given
 * repository by checking the modification time of `.git/FETCH_HEAD`.
 *
 * @param args - The arguments to this function.
 * @param args.repositoryDirectoryPath - The path to the repository.
 * @returns The date of the last fetch if it has occurred, or null otherwise.
 */
async function getLastFetchedDate({
  repositoryDirectoryPath,
}: {
  repositoryDirectoryPath: string;
}): Promise<Date | null> {
  const stats = await getEntryStats(
    path.join(repositoryDirectoryPath, '.git', 'FETCH_HEAD'),
  );
  return stats ? stats.mtime : null;
}

/**
 * Retrieves the name of the branch that the given repository is currently
 * pointing to (i.e., HEAD).
 *
 * @param args - The arguments to this function.
 * @param args.repositoryDirectoryPath - The path to the repository.
 * @returns The name of the current branch.
 * @throws If HEAD is not pointing to a branch, but rather an arbitrary commit.
 */
async function getCurrentBranchName({
  repositoryDirectoryPath,
}: {
  repositoryDirectoryPath: string;
}): Promise<string> {
  logger.debug('Running: git symbolic-ref --quiet HEAD');
  const { stdout } = await execa('git', ['symbolic-ref', '--quiet', 'HEAD'], {
    cwd: repositoryDirectoryPath,
  });
  const match = stdout.match(/^refs\/heads\/(.+)$/u);
  if (match?.[1]) {
    return match[1];
  }
  throw new Error(
    `Error establishing ${repositoryDirectoryPath}: This repo does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
  );
}

/**
 * In order to update a previously cloned MetaMask repository, the repository
 * must be on its default branch. This function checks that this is so.
 *
 * @param existingRepository - The arguments to this function.
 * @param existingRepository.directoryPath - The path to the repository.
 * @param existingRepository.currentBranchName - The name of the currently selected branch.
 * @param existingRepository.defaultBranchName - The name of the default branch.
 * @throws If the current branch and default branch are not the same.
 */
async function requireDefaultBranchSelected({
  directoryPath,
  currentBranchName,
  defaultBranchName,
}: ExistingRepository) {
  if (currentBranchName !== defaultBranchName) {
    throw new Error(
      `Error establishing ${directoryPath}: The default branch "${defaultBranchName}" does not seem to be selected. You'll need to return it to this branch manually.`,
    );
  }
}

/**
 * Ensures that the repository has fresh commits (where fresh means one hour or
 * younger).
 *
 * @param existingRepository - The arguments to this function.
 * @param existingRepository.directoryPath - The path to the repository.
 * @param existingRepository.lastFetchedDate - The date/time when the repository
 * was last fetched.
 * @returns The last fetched date if it has been an hour or less, or now
 * otherwise.
 */
async function ensureDefaultBranchIsUpToDate({
  directoryPath,
  lastFetchedDate,
}: ExistingRepository) {
  const now = new Date();
  if (
    lastFetchedDate &&
    now.getTime() - lastFetchedDate.getTime() <= ONE_HOUR
  ) {
    return lastFetchedDate;
  }

  logger.debug('Running: git pull');
  await execa('git', ['pull'], {
    cwd: directoryPath,
  });
  return now;
}
