import { writeFile } from '@metamask/utils/node';
import path from 'path';

import requireValidPackageManifest from './require-valid-package-manifest';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: require-package-manifest', () => {
  it('passes if the project has a well-formed package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'foo',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
        }),
      );

      const result = await requireValidPackageManifest.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: true,
      });
    });
  });

  it('fails if the project does not have a package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await requireValidPackageManifest.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: '`package.json` does not exist in this project.',
          },
        ],
      });
    });
  });

  it('fails if the project has a malformed package.json', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({ foo: 'bar' }),
      );

      const result = await requireValidPackageManifest.execute({
        template: buildMetaMaskRepository(),
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              'Invalid `package.json`: Missing `packageManager`; Missing `engines`; Missing `devDependencies`.',
          },
        ],
      });
    });
  });

  it('re-throws a unknown error that readJsonFileAs produces', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({ foo: 'bar' }),
      );
      const error = new Error('oops');
      jest.spyOn(project.fs, 'readJsonFileAs').mockRejectedValue(error);

      await expect(
        requireValidPackageManifest.execute({
          template: buildMetaMaskRepository(),
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(error);
    });
  });
});
