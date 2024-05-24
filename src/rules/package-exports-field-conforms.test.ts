import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageExportsFieldConforms from './package-exports-field-conforms';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-exports-field-conforms', () => {
  it('passes if the "exports" field in the project\'s package.json matches the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          exports: {
            '.': {
              test: 'test-pack',
            },
            './package.json': 'test',
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
          exports: {
            '.': {
              test: 'test-pack',
            },
            './package.json': 'test',
            extra: 'export',
          },
        }),
      );

      const result = await packageExportsFieldConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'passed',
      });
    });
  });

  it('fails if the "exports" field in the project\'s package.json does not match the one in the template\'s package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          exports: {
            '.': {
              test: 'test-pack',
            },
            './package.json': 'test',
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
          exports: {
            '.': {
              test: 'test',
            },
            './package.json': 'test',
          },
        }),
      );

      const result = await packageExportsFieldConforms.execute({
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
              "`exports` is { '.': { test: 'test' }, './package.json': 'test' }, when it should be { '.': { test: 'test-pack' }, './package.json': 'test' }.",
          },
        ],
      });
    });
  });
});
