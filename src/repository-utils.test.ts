import { writeFile } from '@metamask/utils/node';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

import {
  getBranchInfo,
  getCurrentBranchName,
  getDefaultBranchName,
  getLastFetchedDate,
  ensureBranchUpToDateWithRemote,
} from './repository-utils';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { fakeDateOnly, mockExeca, withinSandbox } from '../tests/helpers';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('getBranchInfo', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current branch, default branch, and last fetched date for the given repository', async () => {
    const now = new Date('2023-01-01T00:00:00.000Z');
    jest.setSystemTime(now);

    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['symbolic-ref', '--quiet', 'HEAD'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: 'refs/heads/foo' },
        },
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'main'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: '' },
        },
      ]);
      const fetchHeadPath = path.join(
        sandboxDirectoryPath,
        '.git',
        'FETCH_HEAD',
      );
      await writeFile(fetchHeadPath, '');
      await fs.promises.utimes(fetchHeadPath, now, now);

      const branchInfo = await getBranchInfo(sandboxDirectoryPath);

      expect(Object.keys(branchInfo)).toStrictEqual([
        'currentBranchName',
        'defaultBranchName',
        'lastFetchedDate',
      ]);
      expect(branchInfo).toMatchObject({
        currentBranchName: 'foo',
        defaultBranchName: 'main',
        lastFetchedDate: now,
      });
    });
  });
});

describe('getCurrentBranchName', () => {
  it('returns the name of the branch that HEAD refers to', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['symbolic-ref', '--quiet', 'HEAD'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: 'refs/heads/current-branch' },
        },
      ]);

      const branchName = await getCurrentBranchName(sandboxDirectoryPath);

      expect(branchName).toBe('current-branch');
    });
  });

  it('throws if HEAD does not refer to a branch (say, for a detached HEAD)', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['symbolic-ref', '--quiet', 'HEAD'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: 'abc123' },
        },
      ]);

      await expect(getCurrentBranchName(sandboxDirectoryPath)).rejects.toThrow(
        `The repository '${sandboxDirectoryPath}' does not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to the default branch manually.`,
      );
    });
  });
});

describe('getDefaultBranchName', () => {
  it('returns "main" if the main branch exists', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'main'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: '' },
        },
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'master'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: '' },
        },
      ]);

      const branchName = await getDefaultBranchName(sandboxDirectoryPath);

      expect(branchName).toBe('main');
    });
  });

  it('returns "master" if the main branch exists', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'main'],
            { cwd: sandboxDirectoryPath },
          ],
          error: new Error('not found'),
        },
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'master'],
            { cwd: sandboxDirectoryPath },
          ],
          result: { stdout: '' },
        },
      ]);

      const branchName = await getDefaultBranchName(sandboxDirectoryPath);

      expect(branchName).toBe('master');
    });
  });

  it('throws if neither master nor main exists', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      mockExeca(execaMock, [
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'main'],
            { cwd: sandboxDirectoryPath },
          ],
          error: new Error('not found'),
        },
        {
          args: [
            'git',
            ['rev-parse', '--verify', '--quiet', 'master'],
            { cwd: sandboxDirectoryPath },
          ],
          error: new Error('not found'),
        },
      ]);

      await expect(getDefaultBranchName(sandboxDirectoryPath)).rejects.toThrow(
        `Could not detect default branch name for repository '${sandboxDirectoryPath}'.`,
      );
    });
  });
});

describe('getLastFetchedDate', () => {
  it('returns the time that .git/FETCH_HEAD was last modified', async () => {
    const now = new Date('2023-01-01T00:00:00Z');

    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      await writeFile(
        path.join(sandboxDirectoryPath, '.git', 'FETCH_HEAD'),
        '',
      );
      await fs.promises.utimes(
        path.join(sandboxDirectoryPath, '.git', 'FETCH_HEAD'),
        now,
        now,
      );

      const lastFetchedDate = await getLastFetchedDate(sandboxDirectoryPath);

      expect(lastFetchedDate?.getTime()).toStrictEqual(now.getTime());
    });
  });

  it('returns null if .git/FETCH_HEAD does not exist', async () => {
    await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
      const lastFetchedDate = await getLastFetchedDate(sandboxDirectoryPath);

      expect(lastFetchedDate).toBeNull();
    });
  });
});

describe('ensureBranchUpToDateWithRemote', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resets the current branch to the latest version of the given branch if no last fetched date has been recorded', async () => {
    const repositoryDirectoryPath = '/some/directory';
    mockExeca(execaMock, [
      {
        args: ['git', ['fetch'], { cwd: repositoryDirectoryPath }],
        result: { stdout: '' },
      },
      {
        args: [
          'git',
          ['reset', '--hard', 'origin/main'],
          { cwd: repositoryDirectoryPath },
        ],
        result: { stdout: '' },
      },
    ]);

    await ensureBranchUpToDateWithRemote(repositoryDirectoryPath, {
      remoteBranchName: 'main',
      lastFetchedDate: null,
    });

    expect(execaMock).toHaveBeenNthCalledWith(1, 'git', ['fetch'], {
      cwd: repositoryDirectoryPath,
    });
    expect(execaMock).toHaveBeenNthCalledWith(
      2,
      'git',
      ['reset', '--hard', 'origin/main'],
      {
        cwd: repositoryDirectoryPath,
      },
    );
  });

  it('resets the current branch to the latest version of the given branch if the last fetched date is more than an hour in the past', async () => {
    const repositoryDirectoryPath = '/some/directory';
    const lastFetchedDate = new Date('2023-01-01T00:00:00Z');
    const now = new Date('2023-01-01T01:00:01Z');
    jest.setSystemTime(now);
    mockExeca(execaMock, [
      {
        args: ['git', ['fetch'], { cwd: repositoryDirectoryPath }],
        result: { stdout: '' },
      },
      {
        args: [
          'git',
          ['reset', '--hard', 'origin/main'],
          { cwd: repositoryDirectoryPath },
        ],
        result: { stdout: '' },
      },
    ]);

    await ensureBranchUpToDateWithRemote(repositoryDirectoryPath, {
      remoteBranchName: 'main',
      lastFetchedDate,
    });

    expect(execaMock).toHaveBeenNthCalledWith(1, 'git', ['fetch'], {
      cwd: repositoryDirectoryPath,
    });
    expect(execaMock).toHaveBeenNthCalledWith(
      2,
      'git',
      ['reset', '--hard', 'origin/main'],
      {
        cwd: repositoryDirectoryPath,
      },
    );
  });

  it('does not reset the current branch to the latest version of the given branch if the last fetched date is less than an hour in the past', async () => {
    const repositoryDirectoryPath = '/some/directory';
    const lastFetchedDate = new Date('2023-01-01T00:00:00Z');
    const now = new Date('2023-01-01T00:00:59Z');
    jest.setSystemTime(now);
    mockExeca(execaMock, [
      {
        args: ['git', ['fetch'], { cwd: repositoryDirectoryPath }],
        result: { stdout: '' },
      },
      {
        args: [
          'git',
          ['reset', '--hard', 'origin/main'],
          { cwd: repositoryDirectoryPath },
        ],
        result: { stdout: '' },
      },
    ]);

    await ensureBranchUpToDateWithRemote(repositoryDirectoryPath, {
      remoteBranchName: 'main',
      lastFetchedDate,
    });

    expect(execaMock).not.toHaveBeenCalled();
  });
});
