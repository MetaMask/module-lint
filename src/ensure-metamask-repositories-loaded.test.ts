import nock from 'nock';
import path from 'path';

import { ensureMetaMaskRepositoriesLoaded } from './ensure-metamask-repositories-loaded';
import { withinSandbox } from '../tests/helpers';

describe('ensureMetaMaskRepositoriesLoaded', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('if called for the first time', () => {
    it('returns information about all of the repositories in the GitHub MetaMask organization, assuming that there are <= 100', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const validRepositoriesCachePath = path.join(
          sandboxDirectoryPath,
          'valid-repositories.json',
        );
        const existingMetamaskRepositories = [
          {
            name: 'some-valid-module-1',
            fork: false,
            archived: false,
          },
          {
            name: 'some-valid-module-2',
            fork: false,
            archived: false,
          },
        ];
        nock('https://api.github.com')
          .get('/orgs/MetaMask/repos?per_page=100')
          .reply(200, existingMetamaskRepositories);

        const loadedMetamaskRepositories =
          await ensureMetaMaskRepositoriesLoaded({
            validRepositoriesCachePath,
          });

        expect(loadedMetamaskRepositories).toStrictEqual(
          existingMetamaskRepositories,
        );
      });
    });

    it('pages through the GitHub API to return all repositories if there are more than 100', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const validRepositoriesCachePath = path.join(
          sandboxDirectoryPath,
          'valid-repositories.json',
        );
        const existingMetamaskRepositories = [
          {
            name: 'some-valid-module-1',
            fork: false,
            archived: false,
          },
          {
            name: 'some-valid-module-2',
            fork: false,
            archived: false,
          },
        ];
        nock('https://api.github.com')
          .get('/orgs/MetaMask/repos?per_page=100')
          .reply(200, [existingMetamaskRepositories[0]], {
            Link: '<https://api.github.com/orgs/MetaMask/repos?page=2>;rel="next",<https://api.github.com/orgs/MetaMask/repos?page=999&per_page=100>;rel="last"',
          })
          .get('/orgs/MetaMask/repos?page=2&per_page=100')
          .reply(200, [existingMetamaskRepositories[1]]);

        const loadedMetamaskRepositories =
          await ensureMetaMaskRepositoriesLoaded({
            validRepositoriesCachePath,
          });

        expect(loadedMetamaskRepositories).toStrictEqual(
          existingMetamaskRepositories,
        );
      });
    });

    it('throws if there are >= 1000 repositories', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const validRepositoriesCachePath = path.join(
          sandboxDirectoryPath,
          'valid-repositories.json',
        );
        let nockScope = nock('https://api.github.com');
        for (let i = 1; i <= 10; i++) {
          nockScope = nockScope
            .get(
              // This is okay — we're just trying to make this test cleaner.
              // eslint-disable-next-line jest/no-if
              `/orgs/MetaMask/repos?${i === 1 ? '' : `page=${i}&`}per_page=100`,
            )
            .reply(200, [], {
              Link: `<https://api.github.com/orgs/MetaMask/repos?page=${
                i + 1
              }>;rel="next"`,
            });
        }

        await expect(
          ensureMetaMaskRepositoriesLoaded({
            validRepositoriesCachePath,
          }),
        ).rejects.toThrow(
          new Error(
            'An unexpected number of requests were made. Stopping before the rate limit is hit. Please check your code for a bug.',
          ),
        );
      });
    });
  });
});
