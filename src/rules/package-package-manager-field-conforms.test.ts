import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageManagerFieldConforms from './package-package-manager-field-conforms';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-manager-field-conforms', () => {
  it('passes if the "packageManager" field in the project\'s package.json matches the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
          scripts: { test: '' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
          scripts: { test: '' },
        }),
      );

      const result = await packageManagerFieldConforms.execute({
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

  it('fails if the "packageManager" field in the project\'s package.json does not match the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
          scripts: { test: '' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'b',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
          scripts: { test: '' },
        }),
      );

      const result = await packageManagerFieldConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: '`packageManager` is "b", when it should be "a".' },
        ],
      });
    });
  });
});
