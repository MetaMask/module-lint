import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLavamoatTsupConforms from './package-lavamoat-tsup-conforms';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-lavamoat-tsup-conform', () => {
  it('passes if the project and template have the same referenced scripts and matches', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': true,
            },
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
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': true,
            },
          },
        }),
      );
      const result = await packageLavamoatTsupConforms.execute({
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
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': true,
            },
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
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': false,
            },
          },
        }),
      );
      const result = await packageLavamoatTsupConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`tsup>esbuild` is false, when it should be true.',
          },
        ],
      });
    });
  });

  it('fails if the project has lavamoat and allowScripts, but does not contain tsup>ebuild', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': true,
            },
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
          lavamoat: {
            allowScripts: {
              test: true,
            },
          },
        }),
      );
      const result = await packageLavamoatTsupConforms.execute({
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
              "`package.json` should list `'tsup>esbuild': true`, but does not.",
          },
        ],
      });
    });
  });

  it('passes if the project does not contain lavamoat and allowScripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              'tsup>esbuild': true,
            },
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );
      const result = await packageLavamoatTsupConforms.execute({
        template,
        project,
        pass,
        fail,
      });
      expect(result).toStrictEqual({ passed: true });
    });
  });
});
