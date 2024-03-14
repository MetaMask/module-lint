import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import path from 'path';

import requireSourceDirectory from './require-source-directory';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: require-source-directory', () => {
  it('passes if the project has a src/ directory', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await ensureDirectoryStructureExists(
        path.join(project.directoryPath, 'src'),
      );

      const result = await requireSourceDirectory.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: true,
      });
    });
  });

  it('fails if the project does not have a src/ directory', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireSourceDirectory.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`src/` does not exist in this project.',
          },
        ],
      });
    });
  });

  it('passes if the project has a "src" path, but it is a file', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(path.join(project.directoryPath, 'src'), '');

      const result = await requireSourceDirectory.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`src/` is not a directory when it should be.',
          },
        ],
      });
    });
  });
});
