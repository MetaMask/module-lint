import execa from 'execa';
import path from 'path';

import { ONE_HOUR } from './constants';
import { createModuleLogger, projectLogger } from './logging-utils';
import { getEntryStats } from './misc-utils';

const log = createModuleLogger(projectLogger, 'existing-repository');

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
 * Retrieves the default branch of the given repository as reported by GitHub.
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @returns The default branch name.
 */
export async function getDefaultBranchName(
  repositoryDirectoryPath: string,
): Promise<string> {
  const { stdout } = await execa(
    'gh',
    [
      'repo',
      'view',
      '--json',
      'defaultBranchRef',
      '--jq',
      '.defaultBranchRef.name',
    ],
    {
      cwd: repositoryDirectoryPath,
    },
  );
  return stdout.trim();
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
 * Ensures that the current branch of a given repository is closely in sync with
 * a remote branch by resetting it to match if new commits have not been fetched
 * for more than an hour.
 *
 * @param repositoryDirectoryPath - The path to the repository.
 * @param args - Remaining arguments.
 * @param args.remoteBranchName - The name of the remote branch to use to reset
 * the current branch.
 * @param args.lastFetchedDate - The date/time when the repository was last
 * fetched.
 * @returns The last fetched date if it has been an hour or less, or now
 * otherwise.
 */
export async function ensureBranchUpToDateWithRemote(
  repositoryDirectoryPath: string,
  {
    remoteBranchName,
    lastFetchedDate,
  }: {
    remoteBranchName: string;
    lastFetchedDate: Date | null;
  },
) {
  const now = new Date();
  if (
    lastFetchedDate &&
    now.getTime() - lastFetchedDate.getTime() <= ONE_HOUR
  ) {
    return lastFetchedDate;
  }

  log('Running: git fetch');
  await execa('git', ['fetch'], {
    cwd: repositoryDirectoryPath,
  });
  log(`Running: git reset --hard origin/${remoteBranchName}`);
  await execa('git', ['reset', '--hard', `origin/${remoteBranchName}`], {
    cwd: repositoryDirectoryPath,
  });
  return now;
}
