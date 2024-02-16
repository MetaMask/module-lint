import { writeFile } from '@metamask/utils/node';
import path from 'path';

import { fail, pass } from '../rule-helpers';
import packageFilesConform from './package-files-conform';
import {
  buildMetaMaskRepository,
  fakePackageManifest,
  withinSandbox,
} from '../../tests/helpers';

describe('Rule: package-files-conforms', () => {
  it('passes if the "files" field in the project\'s package.json matches the one in the template\'s package.json', async () => {
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

      const result = await packageFilesConform.execute({
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

  it('fails if the "files" field in the project\'s package.json does not match the one in the template\'s package.json', async () => {
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
        files: ['test'],
      };
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify(fakeProjectPackageManifest),
      );

      const result = await packageFilesConform.execute({
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
              '`files` is "[ \'test\' ]", when it should be "[ \'test-files\' ]".',
          },
        ],
      });
    });
  });
});
