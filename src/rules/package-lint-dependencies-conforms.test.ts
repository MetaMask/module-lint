import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageLintDependenciesConforms from './package-lint-dependencies-conforms';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-lint-dependencies-conforms', () => {
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
          devDependencies: { eslint: '1.0.0' },
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

      const result = await packageLintDependenciesConforms.execute({
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

      const result = await packageLintDependenciesConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: 'eslint version is "1.0.0", when it should be "1.1.0".' },
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

      const result = await packageLintDependenciesConforms.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: '`package.json` should contain "eslint", but does not.' },
        ],
      });
    });
  });
});
