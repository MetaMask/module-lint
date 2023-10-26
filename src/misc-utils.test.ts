import { writeFile } from '@metamask/utils/node';
import fs from 'fs';
import path from 'path';

import { getEntryStats } from './misc-utils';
import { withinSandbox } from '../tests/helpers';

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
