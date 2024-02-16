import { writeFile } from '@metamask/utils/node';
import path from 'path';

import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';
import packageExportsConform from './package-exports-conform';

describe('Rule: package-exports-conforms', () => {
  it('passes if the "exports" field in the project\'s package.json matches the one in the template\'s package.json', async () => {
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

      const result = await packageExportsConform.execute({
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

  it('fails if the "exports" field in the project\'s package.json does not match the one in the template\'s package.json', async () => {
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
        exports: {
          '.': {
            test: 'test',
          },
          './package.json': 'test',
        },
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );

      const result = await packageExportsConform.execute({
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
              "`exports` is \"{ '.': { test: 'test' }, './package.json': 'test' }\", when it should be \"{ '.': { test: 'test-pack' }, './package.json': 'test' }\".",
          },
        ],
      });
    });
  });
});
