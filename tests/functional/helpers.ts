import {
  createSandbox,
  ensureDirectoryStructureExists,
} from '@metamask/utils/node';
import type {
  ExecaChildProcess,
  ExecaReturnValue,
  Options as ExecaOptions,
} from 'execa';
import execa from 'execa';
import path from 'path';

import FakePackage from './fake-package';
import { createModuleLogger, projectLogger } from '../../src/logging-utils';

const ROOT_DIR = path.resolve(__dirname, '../..');
const TOOL_EXECUTABLE_PATH = path.join(ROOT_DIR, 'src', 'cli.ts');
const TS_NODE_PATH = path.join(ROOT_DIR, 'node_modules', '.bin', 'ts-node');

const { withinSandbox } = createSandbox('module-lint-tests');

const log = createModuleLogger(projectLogger, 'module-utils:tests');

/**
 * Creates a fake package for use in functional tests along with its directory.
 *
 * @param sandboxDirectoryPath - The sandbox directory.
 * @param name - The name of the fake package.
 * @returns The fake package.
 */
export async function createFakePackage(
  sandboxDirectoryPath: string,
  name: string,
): Promise<FakePackage> {
  const packageDirectoryPath = path.join(sandboxDirectoryPath, name);
  await ensureDirectoryStructureExists(packageDirectoryPath);
  return new FakePackage({ directoryPath: packageDirectoryPath });
}

/**
 * Runs a command within the context of the project.
 *
 * @param executableName - The executable to run.
 * @param args - The arguments to the executable.
 * @param options - Options to `execa`.
 * @returns The result of the command.
 */
async function runCommand(
  executableName: string,
  args?: readonly string[] | undefined,
  options?: ExecaOptions | undefined,
): Promise<ExecaChildProcess> {
  const { env, ...remainingOptions } =
    options === undefined ? { env: {} } : options;

  log(
    'Running command `%s %s`...',
    executableName,
    args?.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg)).join(' '),
  );

  const result = await execa(executableName, args, {
    all: true,
    env: {
      ...env,
      DEBUG_COLORS: '1',
    },
    ...remainingOptions,
  });

  log(
    'Completed command `%s %s`',
    executableName,
    args?.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg)).join(' '),
  );

  return result;
}

/**
 * Since this tool operates on packages, in order to write functional tests,
 * those packages need to somehow exist. This function can be used to create a
 * package for the duration of those functional tests.
 *
 * @param name - The name of the package you want to create.
 * @param test - A function to run; the package will exist in a temporary
 * location while the function is being run and will automatically get destroyed
 * after the function ends. The function is called with an object of type {@link FakePackage} which can
 * be used to interact with that package.
 */
export async function withinFakePackage(
  name: string,
  test: (args: { fakePackage: FakePackage }) => void | Promise<void>,
): Promise<void> {
  await withinSandbox(async ({ directoryPath: sandboxDirectoryPath }) => {
    const fakePackage = await createFakePackage(sandboxDirectoryPath, name);
    await test({ fakePackage });
  });
}

/**
 * Runs `module-lint` with the given arguments.
 *
 * @param args - The arguments to this function.
 * @param args.packages - Paths to the packages that you want to lint.
 * @param args.template - The path to the module template you want to use.
 * @returns The result of the command (from `execa`).
 */
export async function runTool({
  packages,
  template,
}: {
  packages: string[];
  template: string;
}): Promise<ExecaReturnValue> {
  const result = await runCommand(TS_NODE_PATH, [
    '--swc',
    TOOL_EXECUTABLE_PATH,
    ...packages,
    '--template',
    template,
  ]);

  log(
    ['---- START OUTPUT -----', result.all, '---- END OUTPUT -----'].join('\n'),
  );

  return result;
}
