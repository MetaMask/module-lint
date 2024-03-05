import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTypescriptDevDependenciesConform from './package-typescript-dev-dependencies-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-typescript-dev-dependencies-conform', () => {
  it('passes if the typescript related devDependencies of template exist in project with the version matching', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@types/node': '1.0.0',
            'ts-node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
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
            '@types/node': '1.0.0',
            'ts-node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
          },
        }),
      );
      const result = await packageTypescriptDevDependenciesConform.execute({
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
        buildPackageManifestMock({
          devDependencies: {
            '@types/node': '1.0.0',
            'ts-node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
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
            '@types/node': '1.0.0',
            'ts-node': '0.0.1',
            tsup: '1.0.0',
            typescript: '1.0.0',
          },
        }),
      );
      const result = await packageTypescriptDevDependenciesConform.execute({
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
              "`devDependencies.[ts-node]` is '0.0.1', when it should be '1.0.0'.",
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
        buildPackageManifestMock({
          devDependencies: {
            '@types/node': '1.0.0',
            'ts-node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
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
            '@types/node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
          },
        }),
      );
      const result = await packageTypescriptDevDependenciesConform.execute({
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
              "`package.json` should list `'devDependencies.[ts-node]': '1.0.0'`, but does not.",
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
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@types/node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
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
            '@types/node': '1.0.0',
            'ts-node': '1.0.0',
            tsup: '1.0.0',
            typescript: '1.0.0',
          },
        }),
      );
      await expect(
        packageTypescriptDevDependenciesConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `devDependencies.[ts-node]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
