import {
  directoryExists,
  ensureDirectoryStructureExists,
} from '@metamask/utils/node';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { createModuleLogger, projectLogger } from './logging-utils';
import type { AbstractOutputLogger } from './output-logger';
import { RepositoryFilesystem } from './repository-filesystem';
import {
  ensureDefaultBranchIsUpToDate,
  getBranchInfo,
  getCurrentBranchName,
} from './repository-utils';
import type { BranchInfo } from './repository-utils';
import { resolveRepositoryReference } from './resolve-repository-reference';

const log = createModuleLogger(projectLogger, 'establish-metamask-repository');

type ConfirmedRepository = BranchInfo & {
  shortname: string;
  directoryPath: string;
};

/**
 * A repository within the MetaMask organization on GitHub which has been cloned
 * to the local filesystem. More concretely, this could either be a template or
 * a project that requires linting.
 */
export type MetaMaskRepository = ConfirmedRepository & {
  fs: RepositoryFilesystem;
};

/**
 * Information about a repository we know exists on the filesystem.
 */
export type ExistingRepository = ConfirmedRepository & {
  createdAutomatically: boolean;
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
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns The repository.
 */
export async function establishMetaMaskRepository({
  repositoryReference,
  workingDirectoryPath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: AbstractOutputLogger;
}): Promise<MetaMaskRepository> {
  const existingRepository = await ensureRepositoryExists({
    repositoryReference,
    workingDirectoryPath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });
  log('Repository is', existingRepository.shortname);

  const repositoryFilesystem = new RepositoryFilesystem(
    existingRepository.directoryPath,
  );

  if (existingRepository.createdAutomatically) {
    await requireDefaultBranchSelected(existingRepository);

    const updatedLastFetchedDate = await ensureDefaultBranchIsUpToDate(
      existingRepository.directoryPath,
      existingRepository.lastFetchedDate,
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
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  repositoryReference: string;
  workingDirectoryPath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: AbstractOutputLogger;
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
  });
  const isGitRepository = await directoryExists(
    path.join(repositoryDirectoryPath, '.git'),
  );

  if (repositoryDirectoryExists && !isGitRepository) {
    throw new Error(
      `"${repositoryDirectoryPath}" is not a Git repository, cannot proceed.`,
    );
  }

  let branchInfo: BranchInfo;
  if (isGitRepository) {
    log('Repository has been cloned already to', repositoryDirectoryPath);
    branchInfo = await getBranchInfo(repositoryDirectoryPath);
  } else {
    branchInfo = await cloneRepository({
      repositoryShortname,
      repositoryDirectoryPath,
      cachedRepositoriesDirectoryPath,
      outputLogger,
    });
  }

  return {
    ...branchInfo,
    shortname: repositoryShortname,
    directoryPath: repositoryDirectoryPath,
    createdAutomatically: isKnownMetaMaskRepository,
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
  outputLogger: AbstractOutputLogger;
}) {
  /* istanbul ignore next: There's no way to reproduce this; this is just to be absolutely sure */
  if (
    path.dirname(repositoryDirectoryPath) !== cachedRepositoriesDirectoryPath
  ) {
    throw new Error(
      'You seem to be pointing to a directory outside the cached repositories directory. Refusing to proceed to avoid data loss.',
    );
  }

  log('Assuming', repositoryShortname, 'is the name of a MetaMask repo');

  log('Removing existing', repositoryDirectoryPath);
  await fs.promises.rm(repositoryDirectoryPath, {
    recursive: true,
    force: true,
  });

  log('Cloning', repositoryShortname, 'to', repositoryDirectoryPath);
  outputLogger.logToStdout(
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
  const currentBranchName = await getCurrentBranchName(repositoryDirectoryPath);
  const defaultBranchName = currentBranchName;

  return {
    currentBranchName,
    defaultBranchName,
    lastFetchedDate: new Date(),
  };
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
export async function requireDefaultBranchSelected({
  directoryPath,
  currentBranchName,
  defaultBranchName,
}: ExistingRepository) {
  if (currentBranchName !== defaultBranchName) {
    throw new Error(
      `Error establishing repository "${directoryPath}": The default branch "${defaultBranchName}" does not seem to be selected. You'll need to return it to this branch manually.`,
    );
  }
}
