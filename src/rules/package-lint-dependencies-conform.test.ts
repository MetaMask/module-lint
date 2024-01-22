import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLintDependenciesConform from './package-lint-dependencies-conform';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
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
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: {
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            eslint: '1.0.0',
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
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: {
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            eslint: '1.0.0',
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
        passed: true,
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
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.1.0' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.0.0' },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: '`eslint` is "1.0.0", when it should be "1.1.0".' },
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
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { eslint: '1.1.0' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: { testlint: '1.0.0' },
        }),
      );

      const result = await packageLintDependenciesConform.execute({
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
              '`package.json` should list `"eslint": "1.1.0"` in `devDependencies`, but does not.',
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
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: {
            '@metamask/test-config-foo': '1.0.0',
          },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({
          packageManager: 'a',
          engines: { node: 'test' },
          devDependencies: {
            '@metamask/eslint-config-foo': '1.0.0',
            '@typescript-eslint/foo': '1.0.0',
            eslint: '1.0.0',
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
        passed: true,
      });
    });
  });
});
