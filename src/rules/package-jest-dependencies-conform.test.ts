import { writeFile } from '@metamask/utils/node';
import path from 'path';

import packageJestDependenciesConform from './package-jest-dependencies-conform';
import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: package-jest-dependencies-conform', () => {
  it("passes if the jest related dependencies in the project's package.json match the ones in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );

      const result = await packageJestDependenciesConform.execute({
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

  it("fails if the version of a jest related dependency in the project's package.json does not match the version of the same dependency in the template's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const fakeTemplatePackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          jest: '1.1.0',
          'jest-it-up': '1.0.0',
        },
      };
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakeTemplatePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );

      const result = await packageJestDependenciesConform.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          { message: '`jest` is "1.0.0", when it should be "1.1.0".' },
        ],
      });
    });
  });

  it("fails if the jest related dependency exists in the template's package.json, but not in the project's package.json", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      const fakeProjectPackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          'jest-it-up': '1.0.0',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );

      const result = await packageJestDependenciesConform.execute({
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
              '`package.json` should list `"jest": "1.0.0"` in `devDependencies`, but does not.',
          },
        ],
      });
    });
  });

  it("throws error if required jest related dependency in the template's package.json does not exist", async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const fakeTemplatePackageManifest = {
        ...fakePackageManifest,
        devDependencies: {
          'jest-it-up': '1.0.0',
        },
      };
      await writeFile(
        path.join(template.directoryPath, 'package.json'),
        JSON.stringify(fakeTemplatePackageManifest),
      );
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakePackageManifest),
      );

      await expect(
        packageJestDependenciesConform.execute({
          template,
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Could not find "jest" in `devDependencies` of template\'s package.json. This is not the fault of the project, but is rather a bug in a rule.',
      );
    });
  });
});
