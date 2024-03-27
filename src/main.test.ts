import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import execa from 'execa';
import path from 'path';
import { MockWritable } from 'stdio-mock';
import stripAnsi from 'strip-ansi';
import { stringify } from 'yaml';

import { main } from './main';
import { FakeOutputLogger } from '../tests/fake-output-logger';
import type { PrimaryExecaFunction } from '../tests/helpers';
import {
  buildPackageManifestMock,
  fakeDateOnly,
  withinSandbox,
} from '../tests/helpers';
import { setupToolWithMockRepositories } from '../tests/setup-tool-with-mock-repositories';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

const wellFormattedChangelog = `# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[Unreleased]: https://github.com/MetaMask/module-lint/
`;

describe('main', () => {
  beforeEach(() => {
    fakeDateOnly();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('given a list of project references', () => {
    it('produces a fully passing report if all rules executed against the given projects pass', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath, repositories } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: true,
              })),
            ],
          });
        for (const repository of repositories) {
          await ensureDirectoryStructureExists(
            path.join(repository.directoryPath, 'src'),
          );
          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn',
              'plugins',
              'some-plugin',
            ),
            'content for some-plugin',
          );
          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn',
              'releases',
              'some-release',
            ),
            'content for some-release',
          );
          await writeFile(
            path.join(repository.directoryPath, 'package.json'),
            buildPackageManifestMock({
              devDependencies: {
                test: '1.0.0',
                jest: '1.0.0',
                'jest-it-up': '1.0.0',
                '@types/node': '1.0.0',
                'ts-node': '1.0.0',
                tsup: '1.0.0',
                typescript: '1.0.0',
                typedoc: '1.0.0',
                '@metamask/auto-changelog': '1.0.0',
                '@lavamoat/allow-scripts': '1.0.0',
                '@lavamoat/preinstall-always-fail': '1.0.0',
              },
              scripts: {
                test: 'test script',
                'test:watch': 'test watch script',
                build: 'test build',
                'build:types': 'test build types',
                'build:docs': 'test build docs',
                'lint:changelog': 'test changelog',
                lint: 'test build types && yarn lint:changelog',
              },
              repository: {
                url: 'https://github.com/MetaMask/module-lint.git',
              },
              lavamoat: {
                allowScripts: {
                  'tsup>esbuild': true,
                  '@lavamoat/preinstall-always-fail': false,
                },
              },
            }),
          );
          await writeFile(
            path.join(repository.directoryPath, 'README.md'),
            'Install [Yarn whatever](...) Install the current LTS version of [Node.js](https://nodejs.org)',
          );
          await writeFile(
            path.join(repository.directoryPath, '.nvmrc'),
            'content for .nvmrc',
          );
          await writeFile(
            path.join(repository.directoryPath, 'jest.config.js'),
            'content for jest.config.js',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsconfig.json'),
            'content for tsconfig.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsconfig.build.json'),
            'content for tsconfig.build.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsup.config.ts'),
            'content for tsup.config.ts',
          );
          await writeFile(
            path.join(repository.directoryPath, 'typedoc.json'),
            'content for typedoc.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'CHANGELOG.md'),
            wellFormattedChangelog,
          );
          await writeFile(
            path.join(repository.directoryPath, '.editorconfig'),
            'content for .editorconfig',
          );
          await writeFile(
            path.join(repository.directoryPath, '.gitattributes'),
            'content for .gitattributes',
          );
          await writeFile(
            path.join(repository.directoryPath, '.gitignore'),
            'content for .gitignore',
          );
          await writeFile(
            path.join(repository.directoryPath, '.yarnrc.yml'),
            stringify({
              enableScripts: false,
              plugins: [
                {
                  path: '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
                  spec: 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js',
                },
              ],
            }),
          );
          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
            ),
            'test scripts',
          );
        }
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        expect(outputLogger.getStderr()).toBe('');
        expect(outputLogger.getStdout()).toBe(
          `
repo-1
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
- Does the \`packageManager\` field in \`package.json\` conform? ✅
- Does the \`engines.node\` field in \`package.json\` conform? ✅
- Do the lint-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the jest-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the test-related \`scripts\` in \`package.json\` conform? ✅
- Do the typescript-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typescript-related \`scripts\` in \`package.json\` conform? ✅
- Does the \`exports\` field in \`package.json\` conform? ✅
- Does the \`main\` field in \`package.json\` conform? ✅
- Does the \`module\` field in \`package.json\` conform? ✅
- Does the \`types\` field in \`package.json\` conform? ✅
- Does the \`files\` field in \`package.json\` conform? ✅
- Does LavaMoat allow scripts for \`tsup>esbuild\`? ✅
- Do the typedoc-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typedoc-related \`scripts\` in \`package.json\` conform? ✅
- Do the changelog-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the changelog-related \`scripts\` in \`package.json\` conform? ✅
- Do the lavamoat-related \`devDependencies\` in \`package.json\` conform? ✅
- Are postinstall scripts disabled for \`@lavamoat/preinstall-always-fail\`? ✅
- Is \`README.md\` present? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does allow scripts conforms to yarn? ✅
- Is the allow-scripts Yarn plugin installed? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and does it conform? ✅
- Is \`jest.config.js\` present, and does it conform? ✅
- Is \`tsconfig.json\` present, and does it conform? ✅
- Is \`tsconfig.build.json\` present, and does it conform? ✅
- Is \`tsup.config.ts\` present, and does it conform? ✅
- Is \`typedoc.json\` present, and does it conform? ✅
- Is \`CHANGELOG.md\` present? ✅
- Is \`CHANGELOG.md\` well-formatted? ✅
- Is \`.editorconfig\` present, and does it conform? ✅
- Is \`.gitattributes\` present, and does it conform? ✅
- Is \`.gitignore\` present, and does it conform? ✅

Results:       40 passed, 0 failed, 40 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
- Does the \`packageManager\` field in \`package.json\` conform? ✅
- Does the \`engines.node\` field in \`package.json\` conform? ✅
- Do the lint-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the jest-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the test-related \`scripts\` in \`package.json\` conform? ✅
- Do the typescript-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typescript-related \`scripts\` in \`package.json\` conform? ✅
- Does the \`exports\` field in \`package.json\` conform? ✅
- Does the \`main\` field in \`package.json\` conform? ✅
- Does the \`module\` field in \`package.json\` conform? ✅
- Does the \`types\` field in \`package.json\` conform? ✅
- Does the \`files\` field in \`package.json\` conform? ✅
- Does LavaMoat allow scripts for \`tsup>esbuild\`? ✅
- Do the typedoc-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typedoc-related \`scripts\` in \`package.json\` conform? ✅
- Do the changelog-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the changelog-related \`scripts\` in \`package.json\` conform? ✅
- Do the lavamoat-related \`devDependencies\` in \`package.json\` conform? ✅
- Are postinstall scripts disabled for \`@lavamoat/preinstall-always-fail\`? ✅
- Is \`README.md\` present? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does allow scripts conforms to yarn? ✅
- Is the allow-scripts Yarn plugin installed? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and does it conform? ✅
- Is \`jest.config.js\` present, and does it conform? ✅
- Is \`tsconfig.json\` present, and does it conform? ✅
- Is \`tsconfig.build.json\` present, and does it conform? ✅
- Is \`tsup.config.ts\` present, and does it conform? ✅
- Is \`typedoc.json\` present, and does it conform? ✅
- Is \`CHANGELOG.md\` present? ✅
- Is \`CHANGELOG.md\` well-formatted? ✅
- Is \`.editorconfig\` present, and does it conform? ✅
- Is \`.gitattributes\` present, and does it conform? ✅
- Is \`.gitignore\` present, and does it conform? ✅

Results:       40 passed, 0 failed, 40 total
Elapsed time:  0 ms

`,
        );
      });
    });

    it('produces a fully failing report if all rules executed against the given projects fail, listing reasons for failure', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath, repositories } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: true,
              })),
            ],
          });
        // Skip first repo since it's the module template
        for (const repository of repositories.slice(1)) {
          await writeFile(path.join(repository.directoryPath, '.yarnrc'), '');
        }
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        expect(outputLogger.getStderr()).toBe('');
        expect(outputLogger.getStdout()).toBe(
          `
repo-1
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ❌
  - The config file for Yarn Classic, \`.yarnrc\`, is present. Please upgrade this project to Yarn Modern.
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       0 passed, 15 failed, 15 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ❌
  - The config file for Yarn Classic, \`.yarnrc\`, is present. Please upgrade this project to Yarn Modern.
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       0 passed, 15 failed, 15 total
Elapsed time:  0 ms

`,
        );
      });
    });

    it('does not exit immediately if a project errors during linting, but shows the error and continues', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: false,
              })),
            ],
            validRepositories: [
              {
                name: 'repo-2',
                fork: false,
                archived: false,
              },
            ],
          });
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        expect(outputLogger.getStderr()).toContain(
          `Could not resolve 'repo-1' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
        );
        expect(outputLogger.getStdout()).toBe(
          `
Cloning repository MetaMask/repo-2, please wait...

repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       1 passed, 14 failed, 15 total
Elapsed time:  0 ms

`.trimStart(),
        );
      });
    });
  });

  describe('given no project references', () => {
    it('produces a fully passing report if all rules executed against the default projects pass', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath, repositories } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: true,
              })),
            ],
          });
        for (const repository of repositories) {
          await ensureDirectoryStructureExists(
            path.join(repository.directoryPath, 'src'),
          );
          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn',
              'plugins',
              'some-plugin',
            ),
            'content for some-plugin',
          );
          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn',
              'releases',
              'some-release',
            ),
            'content for some-release',
          );
          await writeFile(
            path.join(repository.directoryPath, 'package.json'),
            buildPackageManifestMock({
              devDependencies: {
                test: '1.0.0',
                jest: '1.0.0',
                'jest-it-up': '1.0.0',
                '@types/node': '1.0.0',
                'ts-node': '1.0.0',
                tsup: '1.0.0',
                typescript: '1.0.0',
                typedoc: '1.0.0',
                '@metamask/auto-changelog': '1.0.0',
                '@lavamoat/allow-scripts': '1.0.0',
                '@lavamoat/preinstall-always-fail': '1.0.0',
              },
              scripts: {
                test: 'test script',
                'test:watch': 'test watch script',
                build: 'test build',
                'build:types': 'test build types',
                'build:docs': 'test build docs',
                'lint:changelog': 'test changelog',
                lint: 'test build types && yarn lint:changelog',
              },
              repository: {
                url: 'https://github.com/MetaMask/module-lint.git',
              },
              lavamoat: {
                allowScripts: {
                  'tsup>esbuild': true,
                  '@lavamoat/preinstall-always-fail': false,
                },
              },
            }),
          );
          await writeFile(
            path.join(repository.directoryPath, 'README.md'),
            'Install [Yarn whatever](...) Install the current LTS version of [Node.js](https://nodejs.org)',
          );
          await writeFile(
            path.join(repository.directoryPath, '.nvmrc'),
            'content for .nvmrc',
          );
          await writeFile(
            path.join(repository.directoryPath, 'jest.config.js'),
            'content for jest.config.js',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsconfig.json'),
            'content for tsconfig.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsconfig.build.json'),
            'content for tsconfig.build.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'tsup.config.ts'),
            'content for tsup.config.ts',
          );
          await writeFile(
            path.join(repository.directoryPath, 'typedoc.json'),
            'content for typedoc.json',
          );
          await writeFile(
            path.join(repository.directoryPath, 'CHANGELOG.md'),
            wellFormattedChangelog,
          );
          await writeFile(
            path.join(repository.directoryPath, '.editorconfig'),
            'content for .editorconfig',
          );
          await writeFile(
            path.join(repository.directoryPath, '.gitattributes'),
            'content for .gitattributes',
          );
          await writeFile(
            path.join(repository.directoryPath, '.gitignore'),
            'content for .gitignore',
          );
          await writeFile(
            path.join(repository.directoryPath, '.yarnrc.yml'),
            stringify({
              enableScripts: false,
              plugins: [
                {
                  path: '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
                  spec: 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js',
                },
              ],
            }),
          );

          await writeFile(
            path.join(
              repository.directoryPath,
              '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
            ),
            'test scripts',
          );
        }
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint'],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        expect(outputLogger.getStderr()).toBe('');
        expect(outputLogger.getStdout()).toBe(
          `
repo-1
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
- Does the \`packageManager\` field in \`package.json\` conform? ✅
- Does the \`engines.node\` field in \`package.json\` conform? ✅
- Do the lint-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the jest-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the test-related \`scripts\` in \`package.json\` conform? ✅
- Do the typescript-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typescript-related \`scripts\` in \`package.json\` conform? ✅
- Does the \`exports\` field in \`package.json\` conform? ✅
- Does the \`main\` field in \`package.json\` conform? ✅
- Does the \`module\` field in \`package.json\` conform? ✅
- Does the \`types\` field in \`package.json\` conform? ✅
- Does the \`files\` field in \`package.json\` conform? ✅
- Does LavaMoat allow scripts for \`tsup>esbuild\`? ✅
- Do the typedoc-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typedoc-related \`scripts\` in \`package.json\` conform? ✅
- Do the changelog-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the changelog-related \`scripts\` in \`package.json\` conform? ✅
- Do the lavamoat-related \`devDependencies\` in \`package.json\` conform? ✅
- Are postinstall scripts disabled for \`@lavamoat/preinstall-always-fail\`? ✅
- Is \`README.md\` present? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does allow scripts conforms to yarn? ✅
- Is the allow-scripts Yarn plugin installed? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and does it conform? ✅
- Is \`jest.config.js\` present, and does it conform? ✅
- Is \`tsconfig.json\` present, and does it conform? ✅
- Is \`tsconfig.build.json\` present, and does it conform? ✅
- Is \`tsup.config.ts\` present, and does it conform? ✅
- Is \`typedoc.json\` present, and does it conform? ✅
- Is \`CHANGELOG.md\` present? ✅
- Is \`CHANGELOG.md\` well-formatted? ✅
- Is \`.editorconfig\` present, and does it conform? ✅
- Is \`.gitattributes\` present, and does it conform? ✅
- Is \`.gitignore\` present, and does it conform? ✅

Results:       40 passed, 0 failed, 40 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
- Does the \`packageManager\` field in \`package.json\` conform? ✅
- Does the \`engines.node\` field in \`package.json\` conform? ✅
- Do the lint-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the jest-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the test-related \`scripts\` in \`package.json\` conform? ✅
- Do the typescript-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typescript-related \`scripts\` in \`package.json\` conform? ✅
- Does the \`exports\` field in \`package.json\` conform? ✅
- Does the \`main\` field in \`package.json\` conform? ✅
- Does the \`module\` field in \`package.json\` conform? ✅
- Does the \`types\` field in \`package.json\` conform? ✅
- Does the \`files\` field in \`package.json\` conform? ✅
- Does LavaMoat allow scripts for \`tsup>esbuild\`? ✅
- Do the typedoc-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the typedoc-related \`scripts\` in \`package.json\` conform? ✅
- Do the changelog-related \`devDependencies\` in \`package.json\` conform? ✅
- Do the changelog-related \`scripts\` in \`package.json\` conform? ✅
- Do the lavamoat-related \`devDependencies\` in \`package.json\` conform? ✅
- Are postinstall scripts disabled for \`@lavamoat/preinstall-always-fail\`? ✅
- Is \`README.md\` present? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
- Does the README conform by recommending the correct Yarn version to install? ✅
- Does allow scripts conforms to yarn? ✅
- Is the allow-scripts Yarn plugin installed? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and does it conform? ✅
- Is \`jest.config.js\` present, and does it conform? ✅
- Is \`tsconfig.json\` present, and does it conform? ✅
- Is \`tsconfig.build.json\` present, and does it conform? ✅
- Is \`tsup.config.ts\` present, and does it conform? ✅
- Is \`typedoc.json\` present, and does it conform? ✅
- Is \`CHANGELOG.md\` present? ✅
- Is \`CHANGELOG.md\` well-formatted? ✅
- Is \`.editorconfig\` present, and does it conform? ✅
- Is \`.gitattributes\` present, and does it conform? ✅
- Is \`.gitignore\` present, and does it conform? ✅

Results:       40 passed, 0 failed, 40 total
Elapsed time:  0 ms

`,
        );
      });
    });

    it('produces a fully failing report if all rules executed against the default projects fail, listing reasons for failure', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath, repositories } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: true,
              })),
            ],
          });
        // Skip first repo since it's the module template
        for (const repository of repositories.slice(1)) {
          await writeFile(path.join(repository.directoryPath, '.yarnrc'), '');
        }
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint'],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        expect(outputLogger.getStderr()).toBe('');
        expect(outputLogger.getStdout()).toBe(
          `
repo-1
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ❌
  - The config file for Yarn Classic, \`.yarnrc\`, is present. Please upgrade this project to Yarn Modern.
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       0 passed, 15 failed, 15 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ❌
  - The config file for Yarn Classic, \`.yarnrc\`, is present. Please upgrade this project to Yarn Modern.
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       0 passed, 15 failed, 15 total
Elapsed time:  0 ms

`,
        );
      });
    });

    it('does not exit immediately if a project errors during linting, but shows the error and continues', async () => {
      await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
        const projectNames = ['repo-1', 'repo-2'];
        const { cachedRepositoriesDirectoryPath } =
          await setupToolWithMockRepositories({
            execaMock,
            sandboxDirectoryPath,
            repositories: [
              { name: 'metamask-module-template', create: true },
              ...projectNames.map((projectName) => ({
                name: projectName,
                create: false,
              })),
            ],
            validRepositories: [
              {
                name: 'repo-2',
                fork: false,
                archived: false,
              },
            ],
          });
        const outputLogger = new FakeOutputLogger();

        await main({
          argv: ['node', 'module-lint'],
          stdout: outputLogger.stdout,
          stderr: outputLogger.stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        expect(outputLogger.getStderr()).toContain(
          `Could not resolve 'repo-1' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
        );
        expect(outputLogger.getStdout()).toBe(
          `Cloning repository MetaMask/repo-2, please wait...

repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ❌
  - \`package.json\` does not exist in this project.
- Is \`README.md\` present? ❌
  - \`README.md\` does not exist in this project.
- Are all of the files for Yarn Modern present, and do they conform? ❌
  - \`.yarnrc.yml\` does not exist in this project.
  - \`.yarn/releases/\` does not exist in this project.
  - \`.yarn/plugins/\` does not exist in this project.
- Does the \`src/\` directory exist? ❌
  - \`src/\` does not exist in this project.
- Is \`.nvmrc\` present, and does it conform? ❌
  - \`.nvmrc\` does not exist in this project.
- Is \`jest.config.js\` present, and does it conform? ❌
  - \`jest.config.js\` does not exist in this project.
- Is \`tsconfig.json\` present, and does it conform? ❌
  - \`tsconfig.json\` does not exist in this project.
- Is \`tsconfig.build.json\` present, and does it conform? ❌
  - \`tsconfig.build.json\` does not exist in this project.
- Is \`tsup.config.ts\` present, and does it conform? ❌
  - \`tsup.config.ts\` does not exist in this project.
- Is \`typedoc.json\` present, and does it conform? ❌
  - \`typedoc.json\` does not exist in this project.
- Is \`CHANGELOG.md\` present? ❌
  - \`CHANGELOG.md\` does not exist in this project.
- Is \`.editorconfig\` present, and does it conform? ❌
  - \`.editorconfig\` does not exist in this project.
- Is \`.gitattributes\` present, and does it conform? ❌
  - \`.gitattributes\` does not exist in this project.
- Is \`.gitignore\` present, and does it conform? ❌
  - \`.gitignore\` does not exist in this project.

Results:       1 passed, 14 failed, 15 total
Elapsed time:  0 ms

`,
        );
      });
    });
  });

  describe('given --help', () => {
    it('shows the usage message and exits', async () => {
      const stdout = new MockWritable();
      const stderr = new MockWritable();

      await main({
        argv: ['node', 'module-lint', '--help'],
        stdout,
        stderr,
        config: {
          cachedRepositoriesDirectoryPath: '',
          defaultProjectNames: [],
        },
      });

      const output = stderr.data().map(stripAnsi).join('');

      expect(output).toBe(
        `Analyzes one or more repos for divergence from a template repo.

module-lint [REPO_NAMES...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.

Options:
  -h, --help  Show help  [boolean]
`,
      );
    });
  });

  describe('given an unknown option', () => {
    it('prints an error, shows the usage message, and exits', async () => {
      const stdout = new MockWritable();
      const stderr = new MockWritable();

      await main({
        argv: ['node', 'module-lint', '--foo'],
        stdout,
        stderr,
        config: {
          cachedRepositoriesDirectoryPath: '',
          defaultProjectNames: [],
        },
      });

      const output = stderr.data().map(stripAnsi).join('');

      expect(output).toBe(
        `ERROR: Unknown argument: foo

Analyzes one or more repos for divergence from a template repo.

module-lint [REPO_NAMES...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.

Options:
  -h, --help  Show help  [boolean]
`,
      );
    });
  });
});
