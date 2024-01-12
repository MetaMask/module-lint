import {
  ensureDirectoryStructureExists,
  writeFile,
} from '@metamask/utils/node';
import execa from 'execa';
import path from 'path';
import { MockWritable } from 'stdio-mock';
import stripAnsi from 'strip-ansi';

import { main } from './main';
import { FakeOutputLogger } from '../tests/fake-output-logger';
import type { PrimaryExecaFunction } from '../tests/helpers';
import { fakeDateOnly, withinSandbox } from '../tests/helpers';
import { setupToolWithMockRepositories } from '../tests/setup-tool-with-mock-repositories';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

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
            path.join(repository.directoryPath, '.yarnrc.yml'),
            '',
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
            JSON.stringify({
              packageManager: 'yarn',
              engines: { node: 'test' },
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
- Is \`README.md\` present? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
  - Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and conform? ✅

Results:       11 passed, 0 failed, 11 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
  - Does the \`packageManager\` field in \`package.json\` conform? ✅
  - Does the \`engines.node\` field in \`package.json\` conform? ✅
- Is \`README.md\` present? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
  - Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and conform? ✅

Results:       11 passed, 0 failed, 11 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       0 passed, 6 failed, 6 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       0 passed, 6 failed, 6 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       1 passed, 5 failed, 6 total
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
            path.join(repository.directoryPath, '.yarnrc.yml'),
            '',
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
            JSON.stringify({
              packageManager: 'yarn',
              engines: { node: 'test' },
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
- Is \`README.md\` present? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
  - Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and conform? ✅

Results:       11 passed, 0 failed, 11 total
Elapsed time:  0 ms


repo-2
------

- Is the classic Yarn config file (\`.yarnrc\`) absent? ✅
- Does the package have a well-formed manifest (\`package.json\`)? ✅
  - Does the \`packageManager\` field in \`package.json\` conform? ✅
  - Does the \`engines.node\` field in \`package.json\` conform? ✅
- Is \`README.md\` present? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
  - Does the README conform by recommending node install from nodejs.org? ✅
- Are all of the files for Yarn Modern present, and do they conform? ✅
  - Does the README conform by recommending the correct Yarn version to install? ✅
- Does the \`src/\` directory exist? ✅
- Is \`.nvmrc\` present, and conform? ✅

Results:       11 passed, 0 failed, 11 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       0 passed, 6 failed, 6 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       0 passed, 6 failed, 6 total
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
- Is \`.nvmrc\` present, and conform? ❌
  - \`.nvmrc\` does not exist in this project.

Results:       1 passed, 5 failed, 6 total
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
