import execa from 'execa';

import { ensureMetaMaskRepositoriesLoaded } from './ensure-metamask-repositories-loaded';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { mockExeca } from '../tests/helpers';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('ensureMetaMaskRepositoriesLoaded', () => {
  it('requests the repositories under the MetaMask GitHub organization, limiting the data to just a few fields', async () => {
    mockExeca(execaMock, [
      {
        args: [
          'gh',
          ['api', 'orgs/MetaMask/repos', '--cache', '1h', '--paginate'],
        ],
        result: {
          stdout: JSON.stringify([
            { name: 'utils', fork: false, archived: false, extra: 'info' },
            { name: 'logo', fork: false, archived: false },
            {
              name: 'ethjs-util',
              fork: true,
              archived: false,
              something: 'else',
            },
            { name: 'test-snaps', fork: true, archived: true },
          ]),
        },
      },
    ]);

    const gitHubRepositories = await ensureMetaMaskRepositoriesLoaded();
    expect(gitHubRepositories).toStrictEqual([
      { name: 'utils', fork: false, archived: false },
      { name: 'logo', fork: false, archived: false },
      { name: 'ethjs-util', fork: true, archived: false },
      { name: 'test-snaps', fork: true, archived: true },
    ]);
  });
});
