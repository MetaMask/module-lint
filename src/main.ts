import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

import { DEFAULT_TEMPLATE_REPOSITORY_NAME, USAGE_TEXT } from './constants';
import type { MetaMaskRepository } from './establish-metamask-repository';
import { establishMetaMaskRepository } from './establish-metamask-repository';
import { lintProject } from './lint-project';
import {
  isPromiseFulfilledResult,
  isPromiseRejectedResult,
} from './misc-utils';
import type { SimpleWriteStream } from './output-logger';
import { OutputLogger } from './output-logger';
import { reportProjectLintResult } from './report-project-lint-result';
import { rules } from './rules';

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
 * @param args.config.cachedRepositoriesDirectoryPath - The directory where
 * MetaMask repositories will be (or have been) cloned.
 * @param args.config.defaultProjectNames - The set of MetaMask repositories
 * that will be linted.
 */
export async function main({
  argv,
  stdout,
  stderr,
  config: { cachedRepositoriesDirectoryPath, defaultProjectNames },
}: {
  argv: string[];
  stdout: SimpleWriteStream;
  stderr: SimpleWriteStream;
  config: {
    cachedRepositoriesDirectoryPath: string;
    defaultProjectNames: string[];
  };
}) {
  const outputLogger = new OutputLogger({ stdout, stderr });
  const workingDirectoryPath = process.cwd();

  const inputs = await parseInputs({ argv, outputLogger, defaultProjectNames });
  if (!inputs) {
    // Even if `process` changes, it's okay.
    // eslint-disable-next-line require-atomic-updates
    process.exitCode = 1;
    return;
  }
  const { templateRepositoryName, projectReferences } = inputs;

  const template = await establishMetaMaskRepository({
    repositoryReference: templateRepositoryName,
    workingDirectoryPath,
    cachedRepositoriesDirectoryPath,
    outputLogger,
  });

  await lintProjects({
    projectReferences,
    template,
    workingDirectoryPath,
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
    const projectReferences =
      args.projectNames.length > 0 ? args.projectNames : defaultProjectNames;
    return {
      templateRepositoryName: DEFAULT_TEMPLATE_REPOSITORY_NAME,
      projectReferences,
    };
  }

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
  let yargsFailure: { message: string; error: Error } | null = null;
  const onFail = (message: string, error: Error) => {
    /* istanbul ignore next: Not sure how to produce this */
    if (error) {
      throw error;
    }
    yargsFailure = { message, error };
  };

  const parser = yargs(hideBin(argv))
    .usage(USAGE_TEXT)
    .help(false)
    .version(false)
    .option('help', {
      alias: 'h',
      describe: 'Show help',
      type: 'boolean',
    })
    .wrap(null)
    .exitProcess(false)
    .fail(onFail)
    .strictOptions();

  const options = await parser.parse();

  if (options.help) {
    outputLogger.logToStderr(await parser.getHelp());
    return null;
  }

  if (yargsFailure) {
    const { message } = yargsFailure;
    outputLogger.logToStderr(
      'ERROR: %s\n\n%s',
      message,
      await parser.getHelp(),
    );
    return null;
  }

  return {
    options,
    projectNames: options._.map(String),
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
 * @param args.cachedRepositoriesDirectoryPath - The directory where MetaMask
 * repositories will be (or have been) cloned.
 * @param args.outputLogger - Writable streams for output messages.
 */
async function lintProjects({
  projectReferences,
  template,
  workingDirectoryPath,
  cachedRepositoriesDirectoryPath,
  outputLogger,
}: {
  projectReferences: string[];
  template: MetaMaskRepository;
  workingDirectoryPath: string;
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
        cachedRepositoriesDirectoryPath,
        outputLogger,
      });
    }),
  );

  const fulfilledProjectLintResultPromiseOutcomes =
    projectLintResultPromiseOutcomes.filter(isPromiseFulfilledResult);
  const rejectedProjectLintResultPromiseOutcomes =
    projectLintResultPromiseOutcomes.filter(isPromiseRejectedResult);

  outputLogger.logToStdout('');
  fulfilledProjectLintResultPromiseOutcomes
    .sort((a, b) => {
      return a.value.projectName.localeCompare(b.value.projectName);
    })
    .forEach((fulfilledProjectLintResultPromiseOutcome, index) => {
      reportProjectLintResult({
        projectLintResult: fulfilledProjectLintResultPromiseOutcome.value,
        outputLogger,
      });
      if (index < fulfilledProjectLintResultPromiseOutcomes.length - 1) {
        outputLogger.logToStdout('\n');
      }
    });
  outputLogger.logToStdout('');

  rejectedProjectLintResultPromiseOutcomes.forEach(
    (rejectedProjectLintResultPromiseOutcome) => {
      outputLogger.logToStderr(rejectedProjectLintResultPromiseOutcome.reason);
    },
  );
}
