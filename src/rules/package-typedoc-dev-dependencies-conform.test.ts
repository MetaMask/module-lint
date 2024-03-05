import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTypedocDevDependenciesConform from './package-typedoc-dev-dependencies-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-typedoc-dev-dependencies-conform', () => {
  it('passes if the typedoc related devDependencies of template exist in project with the version matching', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            typedoc: '1.0.0',
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
            typedoc: '1.0.0',
          },
        }),
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

  it('fails if the typedoc related devDependencies of template exist in project, but its version does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            typedoc: '1.0.0',
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
            typedoc: '0.0.1',
          },
        }),
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
              "`devDependencies.[typedoc]` is '0.0.1', when it should be '1.0.0'.",
          },
        ],
      });
    });
  });

  it('fails if the typedoc related devDependencies does not exist in project', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            typedoc: '1.0.0',
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
            test: '1.0.0',
          },
        }),
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
              "`package.json` should list `'devDependencies.[typedoc]': '1.0.0'`, but does not.",
          },
        ],
      });
    });
  });

  it('throws error if the typedoc related devDependencies does not exist in the template', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            test: '1.0.0',
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
            typedoc: '1.0.0',
          },
        }),
      );
      await expect(
        packageTypedocDevDependenciesConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `devDependencies.[typedoc]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
