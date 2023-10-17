import { writeFile } from '@metamask/utils/node';
import fs from 'fs';
import path from 'path';

import {
  getEntryStats,
  indent,
  isPromiseFulfilledResult,
  isPromiseRejectedResult,
  parseGithubApiLinkHeader,
  repeat,
} from './misc-utils';
import { withinSandbox } from '../tests/helpers';

describe('repeat', () => {
  it('returns a string of the given character that is of the given length', () => {
    expect(repeat('-', 10)).toBe('----------');
  });
});

describe('indent', () => {
  it('returns the given string with the given number of spaces (times 2) before it', () => {
    expect(indent('hello', 4)).toBe('        hello');
  });
});

describe('parseGithubApiLinkHeader', () => {
  it('returns the parts of a complete Link header as returned by the GitHub API', async () => {
    const link = parseGithubApiLinkHeader(
      '<https://api.github.com/repositories/1300192/issues?page=2>; rel="prev", <https://api.github.com/repositories/1300192/issues?page=4>; rel="next", <https://api.github.com/repositories/1300192/issues?page=515>; rel="last", <https://api.github.com/repositories/1300192/issues?page=1>; rel="first"',
    );

    expect(link).toStrictEqual({
      prev: 'https://api.github.com/repositories/1300192/issues?page=2',
      next: 'https://api.github.com/repositories/1300192/issues?page=4',
      last: 'https://api.github.com/repositories/1300192/issues?page=515',
      first: 'https://api.github.com/repositories/1300192/issues?page=1',
    });
  });

  it('does not record a tagged URL that is missing its URL', () => {
    const link = parseGithubApiLinkHeader(';rel="prev"');

    expect(link).toStrictEqual({});
  });

  it('does not record a tagged URL that is missing its tag', () => {
    const link = parseGithubApiLinkHeader(
      '<https://api.github.com/repositories/1300192/issues?page=2>;',
    );

    expect(link).toStrictEqual({});
  });

  it('does not record a tagged URL that is missing the name of the tag', () => {
    const link = parseGithubApiLinkHeader(
      '<https://api.github.com/repositories/1300192/issues?page=2>; rel=',
    );

    expect(link).toStrictEqual({});
  });
});

describe('getEntryStats', () => {
  describe('given a file', () => {
    it('returns the stats for the file', async () => {
      expect.assertions(3);

      await withinSandbox(async (sandbox) => {
        const filePath = path.join(sandbox.directoryPath, 'nonexistent.file');
        await writeFile(filePath, '');

        const stats = await getEntryStats(filePath);

        expect(stats).toHaveProperty('atime');
        expect(stats).toHaveProperty('ctime');
        expect(stats).toHaveProperty('mtime');
      });
    });

    it('returns null if the file does not exist', async () => {
      expect.assertions(1);

      await withinSandbox(async (sandbox) => {
        const filePath = path.join(sandbox.directoryPath, 'nonexistent.file');

        expect(await getEntryStats(filePath)).toBeNull();
      });
    });

    it('re-throws a wrapped version of any other error that occurs, assigning it the same code and giving it a stack', async () => {
      expect.assertions(1);

      await withinSandbox(async (sandbox) => {
        const filePath = path.join(sandbox.directoryPath, 'nonexistent.file');
        await writeFile(filePath, '');
        try {
          // Make sandbox root directory non-executable
          await fs.promises.chmod(sandbox.directoryPath, 0o600);

          await expect(getEntryStats(filePath)).rejects.toThrow(
            expect.objectContaining({
              message: `Could not get stats for file or directory '${filePath}'`,
              code: 'EACCES',
              stack: expect.any(String),
              cause: expect.objectContaining({
                message: `EACCES: permission denied, stat '${filePath}'`,
                code: 'EACCES',
              }),
            }),
          );
        } finally {
          // Make sandbox root directory executable again
          await fs.promises.chmod(sandbox.directoryPath, 0o700);
        }
      });
    });
  });
});

describe('isPromiseFulfilledResult', () => {
  it('returns true if given a fulfilled promise settled result', () => {
    const promiseSettledResult = {
      status: 'fulfilled',
      value: 'whatever',
    } as const;

    expect(isPromiseFulfilledResult(promiseSettledResult)).toBe(true);
  });

  it('returns false if given a rejected promise settled result', () => {
    const promiseSettledResult = {
      status: 'rejected',
      reason: 'whatever',
    } as const;

    expect(isPromiseFulfilledResult(promiseSettledResult)).toBe(false);
  });
});

describe('isPromiseRejectedResult', () => {
  it('returns true if given a rejected promise settled result', () => {
    const promiseSettledResult = {
      status: 'rejected',
      reason: 'whatever',
    } as const;

    expect(isPromiseRejectedResult(promiseSettledResult)).toBe(true);
  });

  it('returns false if given a fulfilled promise settled result', () => {
    const promiseSettledResult = {
      status: 'fulfilled',
      value: 'whatever',
    } as const;

    expect(isPromiseRejectedResult(promiseSettledResult)).toBe(false);
  });
});
