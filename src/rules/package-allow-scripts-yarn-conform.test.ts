import { writeFile } from '@metamask/utils/node';
import path from 'path';
import { stringify } from 'yaml';

import packageAllowScriptsYarnConform from './package-allow-scripts-yarn-conform';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-allow-scripts-yarn-conform', () => {
  it('passes if the project has `.yarnrc.yml`, then "enableScripts" is set to "false"', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        stringify({ enableScripts: false, plugins: [] }),
      );

      const result = await packageAllowScriptsYarnConform.execute({
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

  it('fails if the project has `.yarnrc.yml`, then "enableScripts" is set to "true"', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        stringify({ enableScripts: true, plugins: [] }),
      );

      const result = await packageAllowScriptsYarnConform.execute({
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
              "`.yarnrc.yml` should list `'enableScripts': false`, but does not.",
          },
        ],
      });
    });
  });
  it('passes if the project does not have `.yarnrc.yml`', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await packageAllowScriptsYarnConform.execute({
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
});
