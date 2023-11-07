import execa from 'execa';

/**
 * The information about a GitHub repository that we care about. Primarily,
 * we want to know whether repos are forks or have been archived, because we
 * don't want to lint them.
 */
type GitHubRepository = {
  name: string;
  fork: boolean;
  archived: boolean;
};

/**
 * Requests data for the repositories listed under MetaMask's GitHub
 * organization via the GitHub API, or returns the results from a previous call.
 * The data is cached for an hour to prevent unnecessary calls to the GitHub
 * API.
 *
 * @returns The list of repositories (whether previously or newly cached).
 */
export async function ensureMetaMaskRepositoriesLoaded(): Promise<
  GitHubRepository[]
> {
  const { stdout } = await execa('gh', [
    'api',
    'orgs/MetaMask/repos',
    '--cache',
    '1h',
    '--paginate',
  ]);
  const fullGitHubRepositories = JSON.parse(stdout);
  return fullGitHubRepositories.map(
    (fullGitHubRepository: Record<string, unknown>) => {
      return {
        name: fullGitHubRepository.name,
        fork: fullGitHubRepository.fork,
        archived: fullGitHubRepository.archived,
      };
    },
  );
}
