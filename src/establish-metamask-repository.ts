import { ensureDirectoryStructureExists } from '@metamask/utils/node';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { createModuleLogger, projectLogger } from './logging-utils';
import type { AbstractOutputLogger } from './output-logger';
import { RepositoryFilesystem } from './repository-filesystem';
import {
  ensureBranchUpToDateWithRemote,
  getCurrentBranchName,
  getDefaultBranchName,
  getLastFetchedDate,
} from './repository-utils';
import { resolveRepositoryReference } from './resolve-repository-reference';

const log = createModuleLogger(projectLogger, 'establish-metamask-repository');

/**
 * A repository within the MetaMask organization on GitHub which has been cloned
 * to the local filesystem. More concretely, this could either be a template or
 * a project that requires linting. An object of this type will be available
 * within a rule.
 */
export type MetaMaskRepository = {
  shortname: string;
  directoryPath: string;
  defaultBranchName: string;
  lastFetchedDate: Date | null;
  fs: RepositoryFilesystem;
};

/**
 * A repository we know exists on the filesystem.
 */
export type ExistingRepository = {
  shortname: string;
  directoryPath: string;
  defaultBranchName: string;
  lastFetchedDate: Date | null;
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
    const updatedLastFetchedDate = await ensureBranchUpToDateWithRemote(
      existingRepository.directoryPath,
      {
        remoteBranchName: existingRepository.defaultBranchName,
        lastFetchedDate: existingRepository.lastFetchedDate,
      },
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
  const resolvedRepository = await resolveRepositoryReference({
    repositoryReference,
    workingDirectoryPath,
    cachedRepositoriesDirectoryPath,
  });

  let defaultBranchName: string;
  let lastFetchedDate: Date | null;
  if (resolvedRepository.exists) {
    log('Repository already exists at', resolvedRepository.directoryPath);
    defaultBranchName = await getDefaultBranchName(
      resolvedRepository.directoryPath,
    );
    lastFetchedDate = await getLastFetchedDate(
      resolvedRepository.directoryPath,
    );
  } else {
    ({ defaultBranchName, lastFetchedDate } = await cloneRepository({
      repositoryShortname: resolvedRepository.shortname,
      repositoryDirectoryPath: resolvedRepository.directoryPath,
      cachedRepositoriesDirectoryPath,
      outputLogger,
    }));
  }

  return {
    defaultBranchName,
    lastFetchedDate,
    shortname: resolvedRepository.shortname,
    directoryPath: resolvedRepository.directoryPath,
    createdAutomatically: resolvedRepository.createdAutomatically,
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
 * @returns Information about the cloned repository.
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
  // We don't need to get the default branch, as we can assume that the current
  // branch is the default branch, and reusing the current branch prevents us
  // from making an unnecessary request to the GitHub API.
  const defaultBranchName = await getCurrentBranchName(repositoryDirectoryPath);

  return {
    defaultBranchName,
    lastFetchedDate: new Date(),
  };
}
