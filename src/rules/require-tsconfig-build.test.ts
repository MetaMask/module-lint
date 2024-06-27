import { writeFile } from '@metamask/utils/node';
import path from 'path';

import requireTsconfigBuild from './require-tsconfig-build';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: require-tsconfig-build', () => {
  it('passes if the project has a tsconfig.build.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'tsconfig.build.json'),
        'contents of tsconfig-build',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'tsconfig.build.json'),
        'contents of tsconfig-build',
      );

      const result = await requireTsconfigBuild.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'passed',
      });
    });
  });

  it('fails with failure message when tsconfig.build.json does not exist', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'tsconfig.build.json'),
        'contents of tsconfig-build',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireTsconfigBuild.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'failed',
        failures: [
          {
            message: '`tsconfig.build.json` does not exist in this project.',
          },
        ],
      });
    });
  });
});
