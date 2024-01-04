import { writeFile } from '@metamask/utils/node';
import path from 'path';

import classicYarnConfigFileAbsent from './classic-yarn-config-file-absent';
import { buildMetaMaskRepository, withinSandbox } from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

describe('Rule: classic-yarn-config-file-absent', () => {
  it('passes if .yarnrc is not present in the project', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });

      const result = await classicYarnConfigFileAbsent.execute({
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

  it('fails if .yarnrc is present in the project', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, '.yarnrc'),
        'content of yarnrc',
      );

      const result = await classicYarnConfigFileAbsent.execute({
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
              'The config file for Yarn Classic, `.yarnrc`, is present. Please upgrade this project to Yarn Modern.',
          },
        ],
      });
    });
  });
});
