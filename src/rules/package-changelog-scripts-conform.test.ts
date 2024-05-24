import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageChangelogScriptsConform from './package-changelog-scripts-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-changelog-scripts-conform', () => {
  it('passes if the project and template have the `lint:changelog` in scripts and matches and lint scripts contains `yarn lint:changelog`', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
          },
        }),
      );
      const result = await packageChangelogScriptsConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ status: 'passed' });
    });
  });

  it('fails if the project and template have the `lint:changelog` in scripts, but does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            'lint:changelog': 'test',
            lint: 'test build types && yarn lint:changelog',
          },
        }),
      );
      const result = await packageChangelogScriptsConform.execute({
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
              "`scripts.[lint:changelog]` is 'test', when it should be 'test changelog'.",
          },
        ],
      });
    });
  });

  it('fails if the project does not have the `lint:changelog` in scripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            lint: 'test build types && yarn lint:changelog',
          },
        }),
      );
      const result = await packageChangelogScriptsConform.execute({
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
              "`package.json` should list `'scripts.[lint:changelog]': 'test changelog'`, but does not.",
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
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
          },
        }),
      );
      await expect(
        packageChangelogScriptsConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `scripts.[lint:changelog]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });

  it('passes if the project and template have the `lint:changelog` in scripts and matches and there is no lint scripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            'lint:changelog': 'test changelog',
          },
        }),
      );
      const result = await packageChangelogScriptsConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ status: 'passed' });
    });
  });

  it('fails if the project has lint scripts, but does not match the `yarn lint:changelog`', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelog',
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
          scripts: {
            'lint:changelog': 'test changelog',
            lint: 'test build types && yarn lint:changelogs',
          },
        }),
      );
      const result = await packageChangelogScriptsConform.execute({
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
              '`scripts.[lint]` exists, but it does not include `yarn lint:changelog`.',
          },
        ],
      });
    });
  });
});
