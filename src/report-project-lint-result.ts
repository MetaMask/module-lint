import { getErrorMessage } from '@metamask/utils';
import chalk from 'chalk';

import type { RuleExecutionResultNode } from './execute-rules';
import { RuleExecutionStatus } from './execute-rules';
import type { ProjectLintResult } from './lint-project';
import { createModuleLogger, projectLogger } from './logging-utils';
import { repeat, indent } from './misc-utils';
import type { AbstractOutputLogger } from './output-logger';

const log = createModuleLogger(projectLogger, 'fetch-or-populate-file-cache');

/**
 * The number of lint rules that were run and that passed, failed, or errored.
 */
export type ProjectLintStats = {
  totalErrored: number;
  totalFailed: number;
  totalPassed: number;
  totalRun: number;
};

/**
 * Prints a report following linting of a project, including all of the rules
 * that were executed and whether they passed or failed.
 *
 * @param args - The arguments to this function.
 * @param args.projectLintResult - The data collected from the lint execution.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns Total number of passing and failing result.
 */
export function reportProjectLintResult({
  projectLintResult,
  outputLogger,
}: {
  projectLintResult: ProjectLintResult;
  outputLogger: AbstractOutputLogger;
}): ProjectLintStats {
  log(
    'elapsedTimeIncludingLinting',
    projectLintResult.elapsedTimeIncludingLinting,
    'elapsedTimeExcludingLinting',
    projectLintResult.elapsedTimeExcludingLinting,
  );

  outputLogger.logToStdout(chalk.blue(projectLintResult.projectName));
  outputLogger.logToStdout(
    `${chalk.blue(repeat('-', projectLintResult.projectName.length))}\n`,
  );

  const ruleExecutionResultNodes =
    projectLintResult.ruleExecutionResultTree.children;
  const { totalErrored, totalFailed, totalPassed, totalRun } =
    reportRuleExecutionResultNodes({
      ruleExecutionResultNodes,
      outputLogger,
    });

  if (ruleExecutionResultNodes.length > 0) {
    outputLogger.logToStdout('');
  }

  const totalPassedPhrase = `${totalPassed} passed`;
  const totalFailedPhrase = `${totalFailed} failed`;
  const totalErroredPhrase = `${totalErrored} errored`;
  outputLogger.logToStdout(
    '%s       %s, %s, %s, %s',
    chalk.bold('Results:'),
    totalPassed > 0 ? chalk.green(totalPassedPhrase) : totalPassedPhrase,
    totalFailed > 0 ? chalk.red(totalFailedPhrase) : totalFailedPhrase,
    totalErrored > 0 ? chalk.yellow(totalErroredPhrase) : totalErroredPhrase,
    `${totalRun} total`,
  );

  outputLogger.logToStdout(
    '%s  %s ms',
    chalk.bold('Elapsed time:'),
    projectLintResult.elapsedTimeIncludingLinting,
  );

  return { totalErrored, totalFailed, totalPassed, totalRun };
}

/**
 * Determines an appropriate icon for a rule execution result.
 *
 * Note that we include `[` and `]` around the icon in the output, but we set
 * them to use the same foreground color as the background, so that they're
 * hidden when using colors but visible when not. This way we can reuse this
 * output for Slack messages.
 *
 * @param ruleExecutionStatus - The status of executing a rule.
 * @returns The icon as a string.
 */
function determineIconFor(ruleExecutionStatus: RuleExecutionStatus) {
  if (ruleExecutionStatus === RuleExecutionStatus.Failed) {
    return chalk.red.bgRed('[') + chalk.white.bgRed('✘') + chalk.red.bgRed(']');
  }
  if (ruleExecutionStatus === RuleExecutionStatus.Errored) {
    return (
      chalk.yellow.bgYellow('[') +
      chalk.black.bgYellow('?') +
      chalk.yellow.bgYellow(']')
    );
  }
  return (
    chalk.green.bgGreen('[') +
    chalk.black.bgGreen('✔︎') +
    chalk.green.bgGreen(']')
  );
}

/**
 * Prints the results from rules executed against a project.
 *
 * @param args - The arguments to this function.
 * @param args.ruleExecutionResultNodes - The nodes within the rule execution
 * result tree.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns The total number of passing and failing rules encountered.
 */
function reportRuleExecutionResultNodes({
  ruleExecutionResultNodes,
  outputLogger,
}: {
  ruleExecutionResultNodes: RuleExecutionResultNode[];
  outputLogger: AbstractOutputLogger;
}): ProjectLintStats {
  let totalPassed = 0;
  let totalFailed = 0;
  let totalErrored = 0;

  for (const ruleExecutionResultNode of ruleExecutionResultNodes) {
    outputLogger.logToStdout(
      `${determineIconFor(ruleExecutionResultNode.result.status)} ${
        ruleExecutionResultNode.result.ruleDescription
      }`,
    );

    if (ruleExecutionResultNode.result.status === RuleExecutionStatus.Passed) {
      totalPassed += 1;
    } else if (
      ruleExecutionResultNode.result.status === RuleExecutionStatus.Failed
    ) {
      totalFailed += 1;

      for (const failure of ruleExecutionResultNode.result.failures) {
        outputLogger.logToStdout(indent(`- ${chalk.red(failure.message)}`, 2));
      }
    } else if (
      ruleExecutionResultNode.result.status === RuleExecutionStatus.Errored
    ) {
      totalErrored += 1;

      outputLogger.logToStdout(
        indent(
          `- ${chalk.yellow(
            `ERROR: ${getErrorMessage(ruleExecutionResultNode.result.error)}`,
          )}`,
          2,
        ),
      );
    }

    const {
      totalPassed: totalPassedChildren,
      totalFailed: totalFailedChildren,
      totalErrored: totalErroredChildren,
    } = reportRuleExecutionResultNodes({
      ruleExecutionResultNodes: ruleExecutionResultNode.children,
      outputLogger,
    });
    totalPassed += totalPassedChildren;
    totalFailed += totalFailedChildren;
    totalErrored += totalErroredChildren;
  }

  const totalRun = totalPassed + totalFailed + totalErrored;

  return { totalErrored, totalFailed, totalPassed, totalRun };
}
