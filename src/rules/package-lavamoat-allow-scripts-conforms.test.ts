import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLavamoatAllowScriptsConforms from './package-lavamoat-allow-scripts-conforms';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-lavamoat-allow-scripts-conforms', () => {
  it('passes if the project\'s package manifests list `"@lavamoat/preinstall-always-fail": false` in lavamoat.allowScripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              '@lavamoat/preinstall-always-fail': false,
            },
          },
        }),
      );
      const result = await packageLavamoatAllowScriptsConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({ status: 'passed' });
    });
  });

  it('fails if the project\'s package manifests list `"@lavamoat/preinstall-always-fail": true` in lavamoat.allowScripts', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          lavamoat: {
            allowScripts: {
              '@lavamoat/preinstall-always-fail': true,
            },
          },
        }),
      );
      const result = await packageLavamoatAllowScriptsConforms.execute({
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
              '`package.json` should list `"@lavamoat/preinstall-always-fail": false` in `lavamoat[allowScripts]`, but does not.',
          },
        ],
      });
    });
  });
});
