import axios from 'axios';

import { fetchOrPopulateFileCache } from './fetch-or-populate-file-cache';
import { logger } from './logging-utils';
import { parseGithubApiLinkHeader } from './misc-utils';

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
 * @param args - The arguments to this function.
 * @param args.validRepositoriesCachePath - The path to the file that will cache
 * the repository data.
 * @returns The list of repositories (whether previously or newly cached).
 */
export async function ensureMetaMaskRepositoriesLoaded({
  validRepositoriesCachePath,
}: {
  validRepositoriesCachePath: string;
}): Promise<GitHubRepository[]> {
  return await fetchOrPopulateFileCache({
    filePath: validRepositoriesCachePath,
    getDataToCache: async () => {
      return await fetchMetaMaskRepositories();
    },
  });
}

/**
 * Uses the GitHub API to fetch information about the repositories listed under
 * MetaMask's GitHub organization.
 *
 * @returns The list of repositories.
 */
async function fetchMetaMaskRepositories(): Promise<GitHubRepository[]> {
  // NOTE: This can also be done via:
  //
  //   gh api orgs/MetaMask/repos \
  //     --cache 1h
  //     --paginate
  //     -q 'map(select(.archived or .fork or .disabled | not)) | map({name, description, private, updated_at})' | jq --slurp 'flatten | sort_by(.updated_at)'
  return await fetchAllResourcesFromGitHubApi<GitHubRepository>({
    initialUrl: 'https://api.github.com/orgs/MetaMask/repos',
  });
}

/**
 * Uses the GitHub API to request a list of objects. As GitHub only returns a
 * maximum of 100 objects for any given call, this function uses the "Link"
 * header as described in the [Pagination section of the GitHub REST API docs](https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api)
 * to pull all objects.
 *
 * Note that we could achieve a similar thing using the `octokit.paginate`
 * method from `octokit`. However, as of this writing, there are some type
 * issues with this package that prevents this method from being used
 * effectively, and it ends up being much easier just to implement this
 * ourselves.
 *
 * @param args - The arguments to this function.
 * @param args.initialUrl - The URL used to request the first (or only) page of
 * data.
 */
export async function fetchAllResourcesFromGitHubApi<Resource>({
  initialUrl,
}: {
  initialUrl: string;
}): Promise<Resource[]> {
  let allResources: Resource[] = [];
  let url: string | null = initialUrl;
  let i = 0;

  while (url) {
    i += 1;

    logger.debug(`Retrieving repository names from GitHub (${url})...`);
    const response = await axios.get<Resource[]>(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        // Headers aren't camelcase.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'X-GitHub-Api-Version': '2022-11-28',
      },
      params: {
        // This is a valid query parameter to the GitHub API.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        per_page: 100,
      },
    });

    if (i === 10) {
      throw new Error(
        'An unexpected number of requests were made. Stopping before the rate limit is hit. Please check your code for a bug.',
      );
    }

    allResources = allResources.concat(response.data);

    if ('link' in response.headers) {
      const link = parseGithubApiLinkHeader(response.headers.link);
      if (link.next !== undefined) {
        url = link.next;
        continue;
      }
    }
    url = null;
  }

  return allResources;
}
