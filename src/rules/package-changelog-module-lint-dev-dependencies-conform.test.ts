import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageChangelogModuleLintDevDependenciesConform from './package-changelog-module-lint-dev-dependencies-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-changelog-module-lint-dev-dependencies-conform', () => {
  it('passes if the changelog related devDependencies of template exist in module-lint with the version matching', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '1.0.0',
          },
        }),
      );
      const moduleLint = buildMetaMaskRepository({
        shortname: 'module-lint',
        directoryPath: path.join(sandbox.directoryPath, 'module-lint'),
      });
      await writeFile(
        path.join(moduleLint.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '1.0.0',
          },
        }),
      );
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(path.join(sandbox.directoryPath, 'module-lint'));
      const result =
        await packageChangelogModuleLintDevDependenciesConform.execute({
          template,
          project: moduleLint,
          pass,
          fail,
        });

      expect(result).toStrictEqual({ passed: true });
    });
  });

  it('fails if the changelog related devDependencies of template exist in module-lint, but its version does not match', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '1.0.0',
          },
        }),
      );
      const moduleLint = buildMetaMaskRepository({
        shortname: 'module-lint',
        directoryPath: path.join(sandbox.directoryPath, 'module-lint'),
      });
      await writeFile(
        path.join(moduleLint.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '0.0.1',
          },
        }),
      );
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(path.join(sandbox.directoryPath, 'module-lint'));
      const result =
        await packageChangelogModuleLintDevDependenciesConform.execute({
          template,
          project: moduleLint,
          pass,
          fail,
        });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              "`devDependencies.[@metamask/auto-changelog]` is '0.0.1', when it should be '1.0.0'.",
          },
        ],
      });
    });
  });

  it('fails if the changelog related devDependencies does not exist in module-lint', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '1.0.0',
          },
        }),
      );
      const moduleLint = buildMetaMaskRepository({
        shortname: 'module-lint',
        directoryPath: path.join(sandbox.directoryPath, 'module-lint'),
      });
      await writeFile(
        path.join(moduleLint.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            test: '1.0.0',
          },
        }),
      );
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(path.join(sandbox.directoryPath, 'module-lint'));
      const result =
        await packageChangelogModuleLintDevDependenciesConform.execute({
          template,
          project: moduleLint,
          pass,
          fail,
        });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message:
              "`package.json` should list `'devDependencies.[@metamask/auto-changelog]': '1.0.0'`, but does not.",
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
            test: '1.0.0',
          },
        }),
      );
      const moduleLint = buildMetaMaskRepository({
        shortname: 'module-lint',
        directoryPath: path.join(sandbox.directoryPath, 'module-lint'),
      });
      await writeFile(
        path.join(moduleLint.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            '@metamask/auto-changelog': '1.0.0',
          },
        }),
      );
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(path.join(sandbox.directoryPath, 'module-lint'));
      await expect(
        packageChangelogModuleLintDevDependenciesConform.execute({
          template,
          project: moduleLint,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `devDependencies.[@metamask/auto-changelog]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
