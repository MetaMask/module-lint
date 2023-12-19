import { ensureDirectoryStructureExists } from '@metamask/utils/node';
import type { ExecaChildProcess } from 'execa';
import execa from 'execa';
import path from 'path';
import { MockWritable } from 'stdio-mock';
import stripAnsi from 'strip-ansi';

import { main } from './main';
import type { PrimaryExecaFunction } from '../tests/helpers';
import {
  buildExecaResult,
  fakeDateOnly,
  withinSandbox,
} from '../tests/helpers';
import { setupToolWithMockRepositories } from '../tests/setup-tool-with-mock-repositories';

jest.mock('execa');

const execaMock = jest.mocked<PrimaryExecaFunction>(execa);

describe('main', () => {
  beforeEach(() => {
    fakeDateOnly();
    execaMock.mockImplementation((): ExecaChildProcess => {
      return buildExecaResult({ stdout: '' });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('given a list of project references', () => {
    it('lists the rules executed against the default repositories which pass', async () => {
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
        const projects = repositories.filter(
          (repository) => repository.name !== 'metamask-module-template',
        );
        for (const project of projects) {
          await ensureDirectoryStructureExists(
            path.join(project.directoryPath, 'src'),
          );
        }
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        const output = stdout.data().map(stripAnsi).join('');

        expect(output).toBe(
          `
repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ✅

repo-2
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ✅

`,
        );
      });
    });

    it('lists the rules executed against the default repositories which fail', async () => {
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
                create: true,
              })),
            ],
          });
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        const output = stdout.data().map(stripAnsi).join('');

        expect(output).toBe(
          `
repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

repo-2
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

`,
        );
      });
    });

    it('does not exit immediately if a project fails to lint for any reason, but shows the reason and continues', async () => {
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
                name: 'repo-1',
                fork: false,
                archived: false,
              },
            ],
          });
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint', ...projectNames],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: [],
          },
        });

        expect(stdout.data().map(stripAnsi).join('')).toBe(
          `
Cloning repository MetaMask/repo-1, please wait...

repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

`.trimStart(),
        );

        expect(stderr.data().map(stripAnsi).join('')).toContain(
          `Could not resolve 'repo-2' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
        );
      });
    });
  });

  describe('given no project references', () => {
    it('lists the rules executed against the default repositories which pass', async () => {
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
        const projects = repositories.filter(
          (repository) => repository.name !== 'metamask-module-template',
        );
        for (const project of projects) {
          await ensureDirectoryStructureExists(
            path.join(project.directoryPath, 'src'),
          );
        }
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint'],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        const output = stdout.data().map(stripAnsi).join('');

        expect(output).toBe(
          `
repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ✅

repo-2
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ✅

`,
        );
      });
    });

    it('lists the rules executed against the default repositories which fail', async () => {
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
                create: true,
              })),
            ],
          });
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint'],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        const output = stdout.data().map(stripAnsi).join('');

        expect(output).toBe(
          `
repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

repo-2
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

`,
        );
      });
    });

    it('does not exit immediately if a project fails to lint for any reason, but shows the reason and continues', async () => {
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
                name: 'repo-1',
                fork: false,
                archived: false,
              },
            ],
          });
        const stdout = new MockWritable();
        const stderr = new MockWritable();

        await main({
          argv: ['node', 'module-lint'],
          stdout,
          stderr,
          config: {
            cachedRepositoriesDirectoryPath,
            defaultProjectNames: projectNames,
          },
        });

        expect(stdout.data().map(stripAnsi).join('')).toBe(
          `Cloning repository MetaMask/repo-1, please wait...

repo-1
------

Linted project in 0 ms.

- Does the \`src/\` directory exist? ❌
  - \`src\` exists in the module template, but not in this repo.

`,
        );

        expect(stderr.data().map(stripAnsi).join('')).toContain(
          `Could not resolve 'repo-2' as it is neither a reference to a directory nor the name of a known MetaMask repository.`,
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

module-lint OPTIONS [ARGUMENTS...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.

Options:
      --version  Show version number  [boolean]
  -h, --help     Show help  [boolean]
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

module-lint OPTIONS [ARGUMENTS...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.

Options:
      --version  Show version number  [boolean]
  -h, --help     Show help  [boolean]
`,
      );
    });
  });
});
