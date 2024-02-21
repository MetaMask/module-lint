import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTypedocDevDependenciesConform from './package-typedoc-dev-dependencies-conform';
import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-typedoc-dev-dependencies-conform', () => {
  it('passes if the project and template have the same referenced package with the same version', async () => {
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
      const result = await packageTypedocDevDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the project has the same referenced packages as the template, but its version does not match', async () => {
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
        devDependencies: {
          typedoc: '0.0.1',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );
      const result = await packageTypedocDevDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`typedoc` is "0.0.1", when it should be "1.0.0".',
          },
        ],
      });
    });
  });

  it('fails if the project does not have the same referenced package as the template', async () => {
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
        devDependencies: {
          typescript: '1.0.0',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );
      const result = await packageTypedocDevDependenciesConform.execute({
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
              '`package.json` should list `"typedoc": "1.0.0"`, but does not.',
          },
        ],
      });
    });
  });

  it('throws error if the package does not exist in the template devDependencies', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const fakeTemplatePackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          typescript: '1.0.0',
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
        packageTypedocDevDependenciesConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find "typedoc" in template\'s package.json. This is not the fault of the project, but is rather a bug in a rule.',
      );
    });
  });
});
