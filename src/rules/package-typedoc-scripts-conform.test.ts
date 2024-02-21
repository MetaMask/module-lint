import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTypedocScriptsConform from './package-typedoc-scripts-conform';
import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-typedoc-scripts-conform', () => {
  it('passes if the project and template have the same referenced scripts and matches', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const result = await packageTypedocScriptsConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project has the same referenced scripts as the template, but its value does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const fakeProjectPackageManifest = {
        ...fakePackageManifest,
        scripts: {
          'build:docs': 'build docs',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );
      const result = await packageTypedocScriptsConform.execute({
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
              '`build:docs` is "build docs", when it should be "test build docs".',
          },
        ],
      });
    });
  });

  it('fails if the project does not have the same referenced script as the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const fakeProjectPackageManifest = {
        ...fakePackageManifest,
        scripts: {
          'build:types': 'test build types',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );
      const result = await packageTypedocScriptsConform.execute({
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
              '`package.json` should list `"build:docs": "test build docs"`, but does not.',
          },
        ],
      });
    });
  });

  it('throws error if the script does not exist in the template scripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const fakeTemplatePackageManifest = {
        ...fakePackageManifest,
        scripts: {
          'build:types': 'test build types',
        },
      };
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakeTemplatePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      await expect(
        packageTypedocScriptsConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find "build:docs" in template\'s package.json. This is not the fault of the project, but is rather a bug in a rule.',
      );
    });
  });
});
