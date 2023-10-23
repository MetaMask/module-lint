import { hideBin } from 'yargs/helpers';
import createYargs from 'yargs/yargs';

import {
  DEFAULT_TEMPLATE_REPOSITORY_NAME,
  WORKING_DIRECTORY_PATH,
} from './constants';
import type { MetaMaskRepository } from './establish-metamask-repository';
import { establishMetaMaskRepository } from './establish-metamask-repository';
import { lintProject } from './lint-project';
import {
  isPromiseFulfilledResult,
  isPromiseRejectedResult,
} from './misc-utils';
import { OutputLogger } from './output-logger';
import { reportProjectLintResult } from './report-project-lint-result';
import { rules } from './rules';
import type { SimpleWriteStream } from './types';

/**
 * Data created from command-line input used to configure this tool.
 */
export type Inputs = {
  templateRepositoryName: string;
  projectReferences: string[];
};

/**
 * The entrypoint for this tool. Designed to not access `process.argv`,
 * `process.stdout`, or `process.stdout` directly so as to be more easily
 * testable.
 *
 * @param args - The arguments to this function.
 * @param args.argv - The name of this executable and its arguments (as obtained
 * via `process.argv`).
 * @param args.stdout - The standard out stream.
 * @param args.stderr - The standard error stream.
 * @param args.config - Extra configuration.
 * @param args.config.validRepositoriesCachePath - The file that holds known
 * MetaMask repositories (if previously retrieved).
 * @param args.config.cachedRepositoriesDirectoryPath - The directory where
 * MetaMask repositories will be (or have been) cloned.
 * @param args.config.defaultProjectNames - The set of MetaMask repositories
 * that will be linted.
 */
export async function main({
  argv,
  stdout,
  stderr,
  config: {
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    defaultProjectNames,
  },
}: {
  argv: string[];
  stdout: SimpleWriteStream;
  stderr: SimpleWriteStream;
  config: {
    validRepositoriesCachePath: string;
    cachedRepositoriesDirectoryPath: string;
    defaultProjectNames: string[];
  };
}) {
  const outputLogger = new OutputLogger({ stdout, stderr });
  const workingDirectoryPath = WORKING_DIRECTORY_PATH;

  const inputs = await parseInputs({ argv, outputLogger, defaultProjectNames });
  /* istanbul ignore next: At the moment, there is no real way that Yargs could fail */
  if (!inputs) {
    process.exitCode = 1;
    return;
  }
  const { templateRepositoryName, projectReferences } = inputs;

  const template = await establishMetaMaskRepository({
    repositoryReference: templateRepositoryName,
    workingDirectoryPath,
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });

  await lintProjects({
    projectReferences,
    template,
    workingDirectoryPath,
    validRepositoriesCachePath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });
}

/**
 * Parses command-line arguments and establishes parameters for the remainder of
 * this tool.
 *
 * @param args - The arguments to this function.
 * @param args.argv - The name of this executable and its arguments (as obtained
 * via `process.argv`).
 * @param args.outputLogger - Writable streams for output messages.
 * @param args.defaultProjectNames - The set of MetaMask repositories
 * that will be linted.
 * @returns The parsed command-line arguments if parsing was successful, or null
 * otherwise.
 */
async function parseInputs({
  argv,
  outputLogger,
  defaultProjectNames,
}: {
  argv: string[];
  outputLogger: OutputLogger;
  defaultProjectNames: string[];
}): Promise<Inputs | null> {
  const args = await parseCommandLineArguments({ argv, outputLogger });

  if (args) {
    const projectReferences = args._.length > 0 ? args._ : defaultProjectNames;
    return {
      templateRepositoryName: DEFAULT_TEMPLATE_REPOSITORY_NAME,
      projectReferences,
    };
  }

  /* istanbul ignore next: At the moment, there is no real way that Yargs could fail */
  return null;
}

/**
 * Parses the command line using `yargs`.
 *
 * @param args - The arguments to this function.
 * @param args.argv - The name of this executable and its arguments (as obtained
 * via `process.argv`).
 * @param args.outputLogger - Writable streams for output messages.
 */
async function parseCommandLineArguments({
  argv,
  outputLogger,
}: {
  argv: string[];
  outputLogger: OutputLogger;
}) {
  const usageText = `
Analyzes one or more repos for divergence from a template repo.

@metamask/module-lint OPTIONS [ARGUMENTS...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.
`.trim();
  let yargsFailure: { message: string; error: Error } | null = null;
  /* istanbul ignore next: At the moment, there is no real way that Yargs could fail */
  const onFail = (message: string, error: Error) => {
    if (error) {
      throw error;
    }
    yargsFailure = { message, error };
  };

  const yargs = createYargs(hideBin(argv))
    .usage(usageText)
    .help(false)
    .string('_')
    .wrap(null)
    .exitProcess(false)
    .fail(onFail);

  const options = await yargs.parse();

  if (options.help) {
    outputLogger.logToStderr(await yargs.getHelp());
    return null;
  }

  /* istanbul ignore next: At the moment, there is no real way that Yargs could fail */
  if (yargsFailure) {
    outputLogger.logToStderr('%s\n\n%s', yargsFailure, await yargs.getHelp());
    return null;
  }

  return {
    ...options,
    // This is the name that Yargs gives to the arguments that aren't options.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _: options._.map(String),
  };
}

/**
 * Runs all of the rules on the given projects.
 *
 * This is a bit complicated because linting may fail for a particular project.
 * In that case, we don't want to crash the whole tool, but fail gracefully.
 *
 * @param args - The arguments to this function.
 * @param args.projectReferences - References to the projects (either the name
 * of a MetaMask repository, such as "utils", or the path to a local Git
 * repository).
 * @param args.template - The repository to which the project should be
 * compared.
 * @param args.workingDirectoryPath - The directory where this tool was run.
 * @param args.validRepositoriesCachePath - The file that holds known MetaMask
 * repositories (if previously retrieved).
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 */
async function lintProjects({
  projectReferences,
  template,
  workingDirectoryPath,
  validRepositoriesCachePath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  projectReferences: string[];
  template: MetaMaskRepository;
  workingDirectoryPath: string;
  validRepositoriesCachePath: string;
  cachedRepositoriesDirectoryPath: string;
  outputLogger: OutputLogger;
}) {
  const projectLintResultPromiseOutcomes = await Promise.allSettled(
    projectReferences.map(async (projectReference) => {
      return await lintProject({
        projectReference,
        template,
        rules,
        workingDirectoryPath,
        validRepositoriesCachePath,
        cachedRepositoriesDirectoryPath,
        outputLogger,
      });
    }),
  );

  const fulfilledProjectLintResultPromiseOutcomes =
    projectLintResultPromiseOutcomes.filter(isPromiseFulfilledResult);
  const rejectedProjectLintResultPromiseOutcomes =
    projectLintResultPromiseOutcomes.filter(isPromiseRejectedResult);

  fulfilledProjectLintResultPromiseOutcomes
    .sort((a, b) => {
      return a.value.projectName.localeCompare(b.value.projectName);
    })
    .forEach((fulfilledProjectLintResultPromiseOutcome) => {
      reportProjectLintResult({
        projectLintResult: fulfilledProjectLintResultPromiseOutcome.value,
        outputLogger,
      });
    });

  rejectedProjectLintResultPromiseOutcomes.forEach(
    (rejectedProjectLintResultPromiseOutcome) => {
      outputLogger.logToStderr(
        'stack' in rejectedProjectLintResultPromiseOutcome.reason
          ? rejectedProjectLintResultPromiseOutcome.reason.stack
          : /* istanbul ignore next: There's no real way to reproduce this. */ String(
              rejectedProjectLintResultPromiseOutcome.reason,
            ),
      );
    },
  );
}
