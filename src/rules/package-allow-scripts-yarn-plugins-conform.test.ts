import { writeFile } from '@metamask/utils/node';
import path from 'path';
import { stringify } from 'yaml';

import packageAllowScriptsYarnPluginsConform from './package-allow-scripts-yarn-plugins-conform';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-allow-scripts-yarn-plugins-conform', () => {
  it('passes if the project has `.yarnrc.yml`, then `@yarnpkg/plugin-allow-scripts.cjs` file conforms with requied allow scripts in .yarnrc.yml', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'test scripts',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'test scripts',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        stringify({
          enableScripts: true,
          plugins: [
            {
              path: '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
              spec: 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js',
            },
          ],
        }),
      );

      const result = await packageAllowScriptsYarnPluginsConform.execute({
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

  it('fails if the project has `.yarnrc.yml`, then `@yarnpkg/plugin-allow-scripts.cjs` file conforms with requied allow scripts not in .yarnrc.yml', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'test scripts',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'test scripts',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        stringify({
          enableScripts: true,
          plugins: [],
        }),
      );

      const result = await packageAllowScriptsYarnPluginsConform.execute({
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
              "`.yarnrc.yml` should list `'path': '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs' \n 'spec': 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js'` in plugins, but does not.",
          },
        ],
      });
    });
  });
  it('fails if the project has `.yarnrc.yml`, then `@yarnpkg/plugin-allow-scripts.cjs` file does not conform with requied allow scripts in .yarnrc.yml', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(
          template.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'scripts',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(
          project.directoryPath,
          '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ),
        'test scripts',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        stringify({
          enableScripts: true,
          plugins: [
            {
              path: '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
              spec: 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js',
            },
          ],
        }),
      );

      const result = await packageAllowScriptsYarnPluginsConform.execute({
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
              '`.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs` does not match the same file in the template repo.',
          },
        ],
      });
    });
  });
});
