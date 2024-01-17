import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageEnginesNodeFieldConforms from './package-engines-node-field-conforms';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-engines-node-field-conforms', () => {
  it('passes if the "engines.node" field in the project\'s package.json matches the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify({ packageManager: 'a', engines: { node: 'test' } }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({ packageManager: 'a', engines: { node: 'test' } }),
      );

      const result = await packageEnginesNodeFieldConforms.execute({
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

  it('fails if the "engines.node" field in the project\'s package.json does not match the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify({ packageManager: 'a', engines: { node: 'test1' } }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({ packageManager: 'a', engines: { node: 'test2' } }),
      );

      const result = await packageEnginesNodeFieldConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`engines.node` is "test2", when it should be "test1".',
          },
        ],
      });
    });
  });
});
