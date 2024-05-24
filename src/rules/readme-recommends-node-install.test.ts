import { writeFile } from '@metamask/utils/node';
import path from 'path';

import readmeRecommendsNodeInstall from './readme-recommends-node-install';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: readme-recommends-node-install', () => {
  it("passes if the node install recommendation in the project's README matches the same one in the template", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'README.md'),
        'Install the current LTS version of [Node.js](https://nodejs.org)',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'Install the current LTS version of [Node.js](https://nodejs.org)',
      );

      const result = await readmeRecommendsNodeInstall.execute({
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

  it("fails if the node install recommendation in the project's README does not match the same one in the template", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'README.md'),
        'Install the current LTS version of [Node.js](https://nodejs.org)',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'README.md'),
        'Install the current LTS version of [Node.js]',
      );

      const result = await readmeRecommendsNodeInstall.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'failed',
        failures: [
          {
            message:
              '`README.md` should contain "Install the current LTS version of [Node.js](https://nodejs.org)", but does not.',
          },
        ],
      });
    });
  });

  it('throws if the template does not have the node install recommendation in its README for some reason', async () => {
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
        readmeRecommendsNodeInstall.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        "Could not find node install recommendation in template's README. This is not the fault of the project, but is rather a bug in a rule.",
      );
    });
  });
});
