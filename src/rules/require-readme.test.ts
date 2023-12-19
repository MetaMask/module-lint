import { writeFile } from '@metamask/utils/node';
import path from 'path';

import requireReadme from './require-readme';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../execute-rules';

describe('Rule: require-readme', () => {
  it('passes if the project has a README.md', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'content for README',
      );

      const result = await requireReadme.execute({
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

  it('passes if the project does not have a README.md', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireReadme.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`README.md` does not exist in this project.',
          },
        ],
      });
    });
  });
});
