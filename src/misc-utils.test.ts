import { writeFile } from '@metamask/utils/node';
import fs from 'fs';
import path from 'path';
import * as superstruct from 'superstruct';

import {
  assertJsonMatchesStruct,
  getEntryStats,
  indent,
  isPromiseFulfilledResult,
  isPromiseRejectedResult,
  readDirectoryRecursively,
  repeat,
  wrapError,
} from './misc-utils';
import { withinSandbox } from '../tests/helpers';

// Clone the superstruct module so we can spy on its exports
jest.mock('superstruct', () => {
  return {
    ...jest.requireActual('superstruct'),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
  };
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
          // Make sandbox root directory non-executable.
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
          // Make sandbox root directory executable again.
          // Ideally, this should be handled by @metamask/utils.
          await fs.promises.chmod(sandbox.directoryPath, 0o700);
        }
      });
    });
  });
});

describe('assertJsonMatchesStruct', () => {
  it('does not throw if the given object conforms to the given Superstruct schema', () => {
    const Repo = superstruct.object({
      name: superstruct.string(),
      numberOfStars: superstruct.integer(),
    });

    expect(() => {
      assertJsonMatchesStruct({ name: 'utils', numberOfStars: 294 }, Repo);
    }).not.toThrow();
  });

  it('throws a descriptive error if the given object does not conform to the given Superstruct schema', () => {
    const Repo = superstruct.object({
      name: superstruct.string(),
      numberOfStars: superstruct.integer(),
    });

    expect(() => {
      assertJsonMatchesStruct({ numberOfStars: 'whatever' }, Repo);
    }).toThrow(
      new Error(
        'Missing `name`; Invalid `numberOfStars` (Expected an integer, but received: "whatever").',
      ),
    );
  });

  it('re-throws an unknown error that the Superstruct assert function throws', () => {
    const Repo = superstruct.object({
      name: superstruct.string(),
      numberOfStars: superstruct.integer(),
    });
    const error = new Error('oops');
    jest.spyOn(superstruct, 'assert').mockImplementation(() => {
      throw error;
    });

    expect(() => {
      assertJsonMatchesStruct({ numberOfStars: 'whatever' }, Repo);
    }).toThrow(error);
  });
});

describe('readDirectoryRecursively', () => {
  it('reads the directory and all of its child directories, returning a flat list of files and their paths', async () => {
    await withinSandbox(async (sandbox) => {
      const innerDirectoryPath = path.join(sandbox.directoryPath, 'x');
      await writeFile(path.join(innerDirectoryPath, 'a'), '');
      await writeFile(path.join(innerDirectoryPath, 'b', 'c'), '');
      await writeFile(path.join(innerDirectoryPath, 'b', 'd', 'e'), '');

      const entries = await readDirectoryRecursively(innerDirectoryPath);

      expect(entries).toStrictEqual([
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'a'),
          relativePath: 'a',
        }),
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'b/c'),
          relativePath: 'b/c',
        }),
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'b/d/e'),
          relativePath: 'b/d/e',
        }),
      ]);
    });
  });

  it('maps the paths for each file relative to the rootDirectoryPath', async () => {
    await withinSandbox(async (sandbox) => {
      const { directoryPath: rootDirectoryPath } = sandbox;
      const innerDirectoryPath = path.join(sandbox.directoryPath, 'x');
      await writeFile(path.join(innerDirectoryPath, 'a'), '');
      await writeFile(path.join(innerDirectoryPath, 'b', 'c'), '');
      await writeFile(path.join(innerDirectoryPath, 'b', 'd', 'e'), '');

      const entries = await readDirectoryRecursively(
        innerDirectoryPath,
        rootDirectoryPath,
      );

      expect(entries).toStrictEqual([
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'a'),
          relativePath: 'x/a',
        }),
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'b/c'),
          relativePath: 'x/b/c',
        }),
        expect.objectContaining({
          fullPath: path.join(innerDirectoryPath, 'b/d/e'),
          relativePath: 'x/b/d/e',
        }),
      ]);
    });
  });

  it('re-throws a wrapped version of any other error that occurs, assigning it the same code and giving it a stack', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      // Make sandbox root directory non-readable.
      await fs.promises.chmod(sandbox.directoryPath, 0o000);

      try {
        await expect(
          readDirectoryRecursively(sandbox.directoryPath),
        ).rejects.toThrow(
          expect.objectContaining({
            message: `Could not read directory '${sandbox.directoryPath}'`,
            code: 'EACCES',
            stack: expect.any(String),
            cause: expect.objectContaining({
              message: `EACCES: permission denied, scandir '${sandbox.directoryPath}'`,
              code: 'EACCES',
            }),
          }),
        );
      } finally {
        // Make sandbox root directory executable again.
        // Ideally, this should be handled by @metamask/utils.
        await fs.promises.chmod(sandbox.directoryPath, 0o700);
      }
    });
  });
});

// NOTE: A lot of these errors were copied from `@metamask/utils`
// TODO: Copy these back to `@metamask/utils`
describe('wrapError', () => {
  describe('if the original error is an Error instance', () => {
    describe('if the Error was not generated by fs.promises', () => {
      describe('if the global Error constructor takes a "cause" argument', () => {
        let OriginalError: ErrorConstructor;

        beforeEach(() => {
          OriginalError = global.Error;

          class MockError extends Error {
            constructor(message: string, options: { cause?: Error } = {}) {
              super(message);
              this.cause = options.cause;
            }

            cause: Error | undefined;
          }

          // This is necessary as the `length` of our Error won't be 2 otherwise
          Object.defineProperty(MockError, 'length', { value: 2 });

          // NOTE: When we upgrade Jest, change this to use:
          // jest.replaceProperty(global, 'Error', MockError);
          global.Error = MockError as unknown as ErrorConstructor;
        });

        afterEach(() => {
          global.Error = OriginalError;
        });

        it('returns a new Error with the given message', () => {
          const originalError = new Error('oops');

          const newError = wrapError(originalError, 'Some message');

          expect(newError.message).toBe('Some message');
        });

        it('links to the original error via "cause"', () => {
          const originalError = new Error('oops');

          const newError = wrapError(originalError, 'Some message');

          // @ts-expect-error Error causes are not supported by our current `tsc`
          // target (ES2020 — we need ES2022 to make this work).
          expect(newError.cause).toBe(originalError);
        });

        it('copies over any "code" property that exists on the given Error', () => {
          const originalError = new Error('oops');
          // @ts-expect-error The Error interface doesn't have a "code" property
          originalError.code = 'CODE';

          const newError = wrapError(originalError, 'Some message');

          expect(newError.code).toBe('CODE');
        });

        it('allows the "code" to be overridden', () => {
          const originalError = new Error('oops');
          // @ts-expect-error The Error interface doesn't have a "code" property
          originalError.code = 'CODE';

          const newError = wrapError(
            originalError,
            'Some message',
            'CUSTOM_CODE',
          );

          expect(newError.code).toBe('CUSTOM_CODE');
        });
      });

      describe('if the global Error constructor does not take a "cause" argument', () => {
        it('returns a new Error with the given message', () => {
          const originalError = new Error('oops');

          const newError = wrapError(originalError, 'Some message');

          expect(newError.message).toBe('Some message');
        });

        it('links to the original error via "cause"', () => {
          const originalError = new Error('oops');

          const newError = wrapError(originalError, 'Some message');

          // @ts-expect-error Error causes are not supported by our current `tsc`
          // target (ES2020 — we need ES2022 to make this work).
          expect(newError.cause).toBe(originalError);
        });

        it('copies over any "code" property that exists on the given Error', () => {
          const originalError = new Error('oops');
          // @ts-expect-error The Error interface doesn't have a "code" property
          originalError.code = 'CODE';

          const newError = wrapError(originalError, 'Some message');

          expect(newError.code).toBe('CODE');
        });

        it('allows the code to be overridden', () => {
          const originalError = new Error('oops');
          // @ts-expect-error The Error interface doesn't have a "code" property
          originalError.code = 'CODE';

          const newError = wrapError(
            originalError,
            'Some message',
            'CUSTOM_CODE',
          );

          expect(newError.code).toBe('CUSTOM_CODE');
        });
      });
    });

    describe('if the Error was generated by fs.promises', () => {
      it('returns a new Error with the given message', async () => {
        let originalError;
        try {
          await fs.promises.readFile('/tmp/nonexistent', 'utf8');
        } catch (error: any) {
          originalError = error;
        }

        const newError = wrapError(originalError, 'Some message');

        expect(newError.message).toBe('Some message');
      });

      it("links to the original error via 'cause'", async () => {
        let originalError;
        try {
          await fs.promises.readFile('/tmp/nonexistent', 'utf8');
        } catch (error: any) {
          originalError = error;
        }

        const newError = wrapError(originalError, 'Some message');

        // @ts-expect-error Error causes are not supported by our current `tsc`
        // target (ES2020 — we need ES2022 to make this work).
        expect(newError.cause).toBe(originalError);
      });

      it('copies over any "code" property that exists on the given Error', async () => {
        let originalError;
        try {
          await fs.promises.readFile('/tmp/nonexistent', 'utf8');
        } catch (error: any) {
          originalError = error;
        }

        const newError = wrapError(originalError, 'Some message');

        expect(newError.code).toBe('ENOENT');
      });

      it('allows the code to be overridden', () => {
        const originalError = new Error('oops');
        // @ts-expect-error The Error interface doesn't have a "code" property
        originalError.code = 'CODE';

        const newError = wrapError(
          originalError,
          'Some message',
          'CUSTOM_CODE',
        );

        expect(newError.code).toBe('CUSTOM_CODE');
      });
    });
  });

  describe('if the original error is an object but not an Error instance', () => {
    describe('if the message is a non-empty string', () => {
      it('combines a string version of the original error and message together in a new Error', () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, 'Some message');

        expect(newError.message).toBe('[object Object]: Some message');
      });

      it('does not set a cause on the new Error', async () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, 'Some message');

        // @ts-expect-error Error causes are not supported by our current `tsc`
        // target (ES2020 — we need ES2022 to make this work).
        expect(newError.cause).toBeUndefined();
      });

      it('does not set a code on the new Error by default', async () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, 'Some message');

        expect(newError.code).toBeUndefined();
      });

      it('allows the code to be set', () => {
        const originalError = { some: 'error' };

        const newError = wrapError(
          originalError,
          'Some message',
          'CUSTOM_CODE',
        );

        expect(newError.code).toBe('CUSTOM_CODE');
      });
    });

    describe('if the message is an empty string', () => {
      it('places a string version of the original error in a new Error object without an additional message', () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, '');

        expect(newError.message).toBe('[object Object]');
      });

      it('does not set a cause on the new Error', async () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, '');

        // @ts-expect-error Error causes are not supported by our current `tsc`
        // target (ES2020 — we need ES2022 to make this work).
        expect(newError.cause).toBeUndefined();
      });

      it('does not set a code on the new Error', async () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, '');

        expect(newError.code).toBeUndefined();
      });

      it('allows the code to be set', () => {
        const originalError = { some: 'error' };

        const newError = wrapError(originalError, '', 'CUSTOM_CODE');

        expect(newError.code).toBe('CUSTOM_CODE');
      });
    });
  });

  describe('if the original error is a string', () => {
    describe('if the message is a non-empty string', () => {
      it('combines the original error and message together in a new Error', () => {
        const newError = wrapError('Some original message', 'Some message');

        expect(newError.message).toBe('Some original message: Some message');
      });

      it('does not set a cause on the new Error', () => {
        const newError = wrapError('Some original message', 'Some message');

        // @ts-expect-error Error causes are not supported by our current `tsc`
        // target (ES2020 — we need ES2022 to make this work).
        expect(newError.cause).toBeUndefined();
      });

      it('does not set a code on the new Error', () => {
        const newError = wrapError('Some original message', 'Some message');

        expect(newError.code).toBeUndefined();
      });
    });

    describe('if the message is an empty string', () => {
      it('places the original error in a new Error object without an additional message', () => {
        const newError = wrapError('Some original message', '');

        expect(newError.message).toBe('Some original message');
      });

      it('does not set a cause on the new Error', () => {
        const newError = wrapError('Some original message', '');

        // @ts-expect-error Error causes are not supported by our current `tsc`
        // target (ES2020 — we need ES2022 to make this work).
        expect(newError.cause).toBeUndefined();
      });

      it('does not set a code on the new Error', () => {
        const newError = wrapError('Some original message', '');

        expect(newError.code).toBeUndefined();
      });
    });
  });
});

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
