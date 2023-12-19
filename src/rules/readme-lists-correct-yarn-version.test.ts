import { writeFile } from '@metamask/utils/node';
import path from 'path';

import readmeListsCorrectYarnVersion from './readme-lists-correct-yarn-version';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../execute-rules';

describe('Rule: readme-lists-correct-yarn-version', () => {
  it("passes if the Yarn version listed in the project's README matches the same one in the template", async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'README.md'),
        'Install [Yarn Modern](https://...)',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'Install [Yarn Modern](https://...)',
      );

      const result = await readmeListsCorrectYarnVersion.execute({
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

  it("fails if the Yarn version listed in the project's README does not match the same one in the template", async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'README.md'),
        'Install [Yarn Modern](https://...)',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'Install [Yarn v1](https://...)',
      );

      const result = await readmeListsCorrectYarnVersion.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              '`README.md` should contain "Install [Yarn Modern](https://...)", but does not.',
          },
        ],
      });
    });
  });

  it('throws if the template does not have the Yarn version listed in its README for some reason', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'README.md'),
        'clearly something else',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'does not matter',
      );

      await expect(
        readmeListsCorrectYarnVersion.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow("Could not find Yarn version in template's README");
    });
  });
});
