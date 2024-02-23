import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageTestScriptsConform from './package-test-scripts-conform';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-test-scripts-conform', () => {
  it("passes if the test related scripts in the project's package.json match the ones in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test script', 'test:watch': 'test watch script' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test script', 'test:watch': 'test watch script' },
        }),
      );

      const result = await packageTestScriptsConform.execute({
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

  it("fails if a test related script in the project's package.json does not match the same one in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test script', 'test:watch': 'test watch script' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test', 'test:watch': 'test watch script' },
        }),
      );

      const result = await packageTestScriptsConform.execute({
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
              "`scripts.[test]` is 'test', when it should be 'test script'.",
          },
        ],
      });
    });
  });

  it("fails if a test related script exists in the template's package.json, but not in the project's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test script', 'test:watch': 'test watch script' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'test:watch': 'test watch script' },
        }),
      );

      const result = await packageTestScriptsConform.execute({
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
              "`package.json` should list `'scripts.[test]': 'test script'`, but does not.",
          },
        ],
      });
    });
  });

  it("throws error if there are no test related scripts in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { 'test:watch': 'test watch script' },
        }),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          scripts: { test: 'test script', 'test:watch': 'test watch script' },
        }),
      );

      await expect(
        packageTestScriptsConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find `scripts.[test]` in reference `package.json`. This is not the fault of the target `package.json`, but is rather a bug in a rule.',
      );
    });
  });
});
