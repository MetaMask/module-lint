import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageJestScriptsConform from './package-jest-scripts-conform';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-jest-scripts-conform', () => {
  it("passes if the jest related scripts in the project's package.json matches the one in the template's package.json", async () => {
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
            jest: '1.0.0',
            'jest-it-up': '1.0.0',
          },
          scripts: {
            test: 'test script',
            'test:watch': 'test watch script',
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
            jest: '1.0.0',
            'jest-it-up': '1.0.0',
          },
          scripts: {
            test: 'test script',
            'test:watch': 'test watch script',
          },
        }),
      );

      const result = await packageJestScriptsConform.execute({
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

  it("fails if the script of jest related in the project's package.json does not match the one in the template's package.json", async () => {
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
          devDependencies: { jest: '1.1.0' },
          scripts: {
            test: 'test script',
            'test:watch': 'test watch script',
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
          devDependencies: { jest: '1.0.0' },
          scripts: {
            test: 'test',
            'test:watch': 'test watch script',
          },
        }),
      );

      const result = await packageJestScriptsConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: '`test` is "test", when it should be "test script".' },
        ],
      });
    });
  });

  it("fails if the jest related script exist in the template's package.json, but not in the project's package.json", async () => {
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
          devDependencies: { jest: '1.1.0' },
          scripts: {
            test: 'test script',
            'test:watch': 'test watch script',
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
          devDependencies: { test: '1.0.0' },
          scripts: {
            'test:watch': 'test watch script',
          },
        }),
      );

      const result = await packageJestScriptsConform.execute({
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
              '`package.json` should list `"test": "test script"` in `scripts`, but does not.',
          },
        ],
      });
    });
  });

  it("throws error if there're no jest related scripts in the template's package.json", async () => {
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
            foo: '1.0.0',
          },
          scripts: {
            'test:watch': 'test watch script',
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
            jest: '1.0.0',
            'jest-it-up': '1.0.0',
          },
          scripts: {
            test: 'test scripts',
            'test:watch': 'test watch scripts',
          },
        }),
      );

      await expect(
        packageJestScriptsConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find "test" in `scripts` of template\'s package.json. This is not the fault of the project, but is rather a bug in a rule.',
      );
    });
  });
});
