import { writeFile } from '@metamask/utils/node';
import path from 'path';

import allYarnModernFilesConform from './all-yarn-modern-files-conform';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../execute-rules';

describe('Rule: all-yarn-modern-files-conform', () => {
  it("passes if the template's .yarnrc.yml file, .yarn/releases directory, and .yarn/plugins directory match the project's", async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );

      const result = await allYarnModernFilesConform.execute({
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

  it('fails if the project does not have a .yarnrc.yml', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );

      const result = await allYarnModernFilesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`.yarnrc.yml` does not exist in this project.',
          },
        ],
      });
    });
  });

  it('fails if the project does not have a .yarn/releases directory', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );

      const result = await allYarnModernFilesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`.yarn/releases/` does not exist in this project.',
          },
        ],
      });
    });
  });

  it("fails if a file in the template's .yarn/releases directory does not match the same file in the project", async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release xxxxxx',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );

      const result = await allYarnModernFilesConform.execute({
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
              '`.yarn/releases/some-release` does not match the same file in the template repo.',
          },
        ],
      });
    });
  });

  it('fails if the project does not have a .yarn/plugins directory', async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );

      const result = await allYarnModernFilesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`.yarn/plugins/` does not exist in this project.',
          },
        ],
      });
    });
  });

  it("fails if a file in the template's .yarn/plugins directory does not match the same file in the project", async () => {
    expect.assertions(1);

    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(template.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin',
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc.yml'),
        'content of yarnrc',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'releases', 'some-release'),
        'content of some-release',
      );
      await writeFile(
        path.join(project.directoryPath, '.yarn', 'plugins', 'some-plugin'),
        'content of some-plugin xxxxxx',
      );

      const result = await allYarnModernFilesConform.execute({
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
              '`.yarn/plugins/some-plugin` does not match the same file in the template repo.',
          },
        ],
      });
    });
  });
});
