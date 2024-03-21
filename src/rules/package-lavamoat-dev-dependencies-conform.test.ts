import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLavamoatDevDependenciesConform from './package-lavamoat-dev-dependencies-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-lavamoat-dev-dependencies-conform', () => {
  it('passes if the lavamoat related devDependencies of template exist in project with the version matching', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const result = await packageLavamoatDevDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the lavamoat related devDependencies of template exist in project, but its version does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '0.0.1',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const result = await packageLavamoatDevDependenciesConform.execute({
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
              "`devDependencies.[@lavamoat/allow-scripts]` is '0.0.1', when it should be '1.0.0'.",
          },
        ],
      });
    });
  });

  it('fails if the lavamoat related devDependencies does not exist in project', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      const result = await packageLavamoatDevDependenciesConform.execute({
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
              "`package.json` should list `'devDependencies.[@lavamoat/allow-scripts]': '1.0.0'`, but does not.",
          },
        ],
      });
    });
  });

  it('throws error if the changelog related devDependencies does not exist in the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@lavamoat/allow-scripts': '1.0.0',
            '@lavamoat/preinstall-always-fail': '1.0.0',
          },
        }),
      );
      await expect(
        packageLavamoatDevDependenciesConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `devDependencies.[@lavamoat/preinstall-always-fail]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
