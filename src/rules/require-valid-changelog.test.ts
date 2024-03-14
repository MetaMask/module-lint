import { getErrorMessage, writeFile } from '@metamask/utils/node';
import path from 'path';

import validateChangelog from './require-valid-changelog';
import {
  buildMetaMaskRepository,
  buildPackageManifestMock,
  withinSandbox,
} from '../../tests/helpers';
import { fail, pass } from '../rule-helpers';

const wellFormattedChangelog = `# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[Unreleased]: https://github.com/MetaMask/module-lint/
`;

const invalidChangelog = `# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[Unreleased]: https://github.com/MetaMask/module-lint/`;

describe('Rule: require-valid-changelog', () => {
  it('passes if the changelog.md is well formatted', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          version: '0.0.0',
          repository: { url: 'https://github.com/MetaMask/module-lint.git' },
        }),
      );
      await writeFile(
        path.join(project.directoryPath, 'CHANGELOG.md'),
        wellFormattedChangelog,
      );

      const result = await validateChangelog.execute({
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

  it('fails if the changelog.md is not well formatted', async () => {
    await withinSandbox(async (sandbox) => {
      const template = buildMetaMaskRepository({
        shortname: 'template',
        directoryPath: path.join(sandbox.directoryPath, 'template'),
      });
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({
          version: '0.0.0',
          repository: { url: 'https://github.com/MetaMask/module-lint.git' },
        }),
      );
      await writeFile(
        path.join(project.directoryPath, 'CHANGELOG.md'),
        invalidChangelog,
      );

      const result = await validateChangelog.execute({
        template,
        project,
        pass,
        fail,
      });

      expect(result).toStrictEqual({
        passed: false,
        failures: [
          {
            message: 'Changelog is not well-formatted.',
          },
        ],
      });
    });
  });

  it('fails if the package manifest is not well formed', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        buildPackageManifestMock({ repository: {} }),
      );
      await writeFile(
        path.join(project.directoryPath, 'CHANGELOG.md'),
        invalidChangelog,
      );
      await expect(
        validateChangelog.execute({
          template: buildMetaMaskRepository(),
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        'Missing `url`.\n The package does not have a well-formed manifest. This is not the fault of the changelog, but this rule requires a valid package manifest.',
      );
    });
  });

  it('re-throws a unknown error where there is no error code or it is not an instance of ChangelogFormattingError', async () => {
    await withinSandbox(async (sandbox) => {
      const project = buildMetaMaskRepository({
        shortname: 'project',
        directoryPath: path.join(sandbox.directoryPath, 'project'),
      });
      await writeFile(
        path.join(project.directoryPath, 'package.json'),
        JSON.stringify({ foo: 'bar' }),
      );
      await writeFile(
        path.join(project.directoryPath, 'CHANGELOG.md'),
        wellFormattedChangelog,
      );
      const error = new Error('unknown error');
      jest.spyOn(project.fs, 'readJsonFileAs').mockRejectedValueOnce(error);

      await expect(
        validateChangelog.execute({
          template: buildMetaMaskRepository(),
          project,
          pass,
          fail,
        }),
      ).rejects.toThrow(
        `Encountered an error validating the changelog: ${getErrorMessage(
          error,
        )}.`,
      );
    });
  });
});
