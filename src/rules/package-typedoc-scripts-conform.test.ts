import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTypedocScriptsConform from './package-typedoc-scripts-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-typedoc-scripts-conform', () => {
  it('passes if the project and template have the build:docs in scripts and matches', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test build docs' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test build docs' },
        }),
      );
      const result = await packageTypedocScriptsConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ status: 'passed' });
    });
  });

  it('fails if the project and template have the build:docs in scripts, but does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test build docs' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test' },
        }),
      );
      const result = await packageTypedocScriptsConform.execute({
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
              "`scripts.[build:docs]` is 'test', when it should be 'test build docs'.",
          },
        ],
      });
    });
  });

  it('fails if the project does not have the build:docs in scripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test build docs' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'test:docs': 'test docs' },
        }),
      );
      const result = await packageTypedocScriptsConform.execute({
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
              "`package.json` should list `'scripts.[build:docs]': 'test build docs'`, but does not.",
          },
        ],
      });
    });
  });

  it("throws error if build:docs does not exist in template's scripts", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'test:docs': 'test docs' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'build:docs': 'test build docs' },
        }),
      );
      await expect(
        packageTypedocScriptsConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `scripts.[build:docs]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
