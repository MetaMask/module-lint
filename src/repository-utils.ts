import execa from 'execa';
import path from 'path';

import { ONE_HOUR } from './constants';
import { createModuleLogger, projectLogger } from './logging-utils';
import { getEntryStats } from './misc-utils';

const log = createModuleLogger(projectLogger, 'existing-repository');

/**
 * Information about a Git branch.
 */
export type BranchInfo = {
  currentBranchName: string;
  defaultBranchName: string;
  lastFetchedDate: Date | null;
};

/**
 * Collects the current and default branch name of the given repository as well
 * as the time when commits were last fetched.
 *
 * @param repositoryDirectoryPath - The path to the repository.
 */
export async function getBranchInfo(
  repositoryDirectoryPath: string,
): Promise<BranchInfo> {
  const currentBranchName = await getCurrentBranchName(repositoryDirectoryPath);
  const defaultBranchName = await getDefaultBranchName(repositoryDirectoryPath);
  const lastFetchedDate = await getLastFetchedDate(repositoryDirectoryPath);
  return {
    currentBranchName,
    defaultBranchName,
    lastFetchedDate,
  };
}

/**
 * Retrieves the name of the branch that the given repository is currently
 * pointing to (i.e., HEAD).
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @returns The name of the current branch.
 * @throws If HEAD is not pointing to a branch, but rather an arbitrary commit.
 */
export async function getCurrentBranchName(
  repositoryDirectoryPath: string,
): Promise<string> {
  log('Running: git symbolic-ref --quiet HEAD');
  const { stdout } = await execa('git', ['symbolic-ref', '--quiet', 'HEAD'], {
    cwd: repositoryDirectoryPath,
  });
  const match = stdout.match(/^refs\/heads\/(.+)$/u);
  const currentBranchName = match?.[1] ?? null;
  if (!currentBranchName) {
    throw new Error(
      `The repository '${repositoryDirectoryPath}' does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
    );
  }
  return currentBranchName;
}

/**
 * Retrieves the default branch of the given repository, that is, the branch
 * that represents the main line of development. Unfortunately there's no good
 * way to obtain this, so this function just tries "main" followed by "master".
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @returns The default branch name.
 * @throws If neither "main" nor "master" exist.
 */
export async function getDefaultBranchName(
  repositoryDirectoryPath: string,
): Promise<string> {
  try {
    log('Running: git rev-parse --verify --quiet main');
    await execa('git', ['rev-parse', '--verify', '--quiet', 'main'], {
      cwd: repositoryDirectoryPath,
    });
    return 'main';
  } catch (error) {
    log('Command `git rev-parse --verify --quiet main` failed:', error);
  }

  try {
    log('Running: git rev-parse --verify --quiet master');
    await execa('git', ['rev-parse', '--verify', '--quiet', 'master'], {
      cwd: repositoryDirectoryPath,
    });
    return 'master';
  } catch (error) {
    log('Command `git rev-parse --verify --quiet master` failed:', error);
  }

  throw new Error(
    `Could not detect default branch name for repository '${repositoryDirectoryPath}'.`,
  );
}

/**
 * Retrieves the date/time that any commits were last fetched for the given
 * repository by checking the modification time of `.git/FETCH_HEAD`.
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @returns The date of the last fetch if it has occurred, or null otherwise.
 */
export async function getLastFetchedDate(
  repositoryDirectoryPath: string,
): Promise<Date | null> {
  const stats = await getEntryStats(
    path.join(repositoryDirectoryPath, '.git', 'FETCH_HEAD'),
  );
  return stats ? stats.mtime : null;
}

/**
 * Ensures that the repository has fresh commits (where fresh means one hour or
 * younger).
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @param lastFetchedDate - The date/time when the repository
 * was last fetched.
 * @returns The last fetched date if it has been an hour or less, or now
 * otherwise.
 */
export async function ensureDefaultBranchIsUpToDate(
  repositoryDirectoryPath: string,
  lastFetchedDate: Date | null,
) {
  const now = new Date();
  if (
    lastFetchedDate &&
    now.getTime() - lastFetchedDate.getTime() <= ONE_HOUR
  ) {
    return lastFetchedDate;
  }

  log('Running: git pull');
  await execa('git', ['pull'], {
    cwd: repositoryDirectoryPath,
  });
  return now;
}
