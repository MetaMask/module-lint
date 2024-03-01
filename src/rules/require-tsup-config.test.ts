import { writeFile } from '@metamask/utils/node';
import path from 'path';

import requireTsupConfig from './require-tsup-config';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: require-tsup-config', () => {
  it('passes if the project has a tsup.config.ts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'tsup.config.ts'),
        'contents of tsup-config',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'tsup.config.ts'),
        'contents of tsup-config',
      );

      const result = await requireTsupConfig.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: true,
      });
    });
  });

  it('fails with failure message when tsup.config.ts does not exist', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'tsup.config.ts'),
        'contents of tsup-config',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireTsupConfig.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`tsup.config.ts` does not exist in this project.',
          },
        ],
      });
    });
  });
});
