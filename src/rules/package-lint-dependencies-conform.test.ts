import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLintDependenciesConform from './package-lint-dependencies-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-lint-dependencies-conform', () => {
  it("passes if the lint related dependencies in the project's package.json matches the one in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            eslint: '1.0.0',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
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
            eslint: '1.0.0',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
          },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
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

  it("fails if the version of lint related dependencies in the project's package.json does not match the one in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            eslint: '1.0.0',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
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
            eslint: '0.0.1',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
          },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        status: 'failed',
        failures: [
          { message: '`eslint` is "0.0.1", when it should be "1.0.0".' },
        ],
      });
    });
  });

  it("fails if the lint related dependency exist in the template's package.json, but not in the project's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            eslint: '1.0.0',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
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
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
          },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
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
              '`package.json` should list `"eslint": "1.0.0"` in `devDependencies`, but does not.',
          },
        ],
      });
    });
  });

  it("passes if the there're no lint related dependencies in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock(),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          devDependencies: {
            eslint: '1.0.0',
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            'eslint-plugin-foo': '1.0.0',
            'eslint-config-foo': '1.0.0',
            prettier: '1.0.0',
            'prettier-plugin-foo': '1.0.0',
            'prettier-config-foo': '1.0.0',
          },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
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
});
