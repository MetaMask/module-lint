import { writeFile } from '@metamask/utils/node';
import path from 'path';

import requireTypedoc from './require-typedoc';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: require-typedoc', () => {
  it('passes if the project has a typedoc.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'typedoc.json'),
        'contents of typedoc',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'typedoc.json'),
        'contents of typedoc',
      );

      const result = await requireTypedoc.execute({
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

  it('fails with failure message when typedoc.json does not exist', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'typedoc.json'),
        'contents of typedoc.json',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireTypedoc.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'failed',
        failures: [
          {
            message: '`typedoc.json` does not exist in this project.',
          },
        ],
      });
    });
  });
});
