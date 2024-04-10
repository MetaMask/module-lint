import chalk from 'chalk';

import type { RuleExecutionResultNode } from './execute-rules';
import type { ProjectLintResult } from './lint-project';
import { createModuleLogger, projectLogger } from './logging-utils';
import { repeat, indent } from './misc-utils';
import type { AbstractOutputLogger } from './output-logger';

const log = createModuleLogger(projectLogger, 'fetch-or-populate-file-cache');

/**
 * Prints a report following linting of a project, including all of the rules
 * that were executed and whether they passed or failed.
 *
 * @param args - The arguments to this function.
 * @param args.projectLintResult - The data collected from the lint execution.
 * @param args.outputLogger - Writable streams for output messages.
 * @returns Passing and Failing numbers.
 */
export function reportProjectLintResult({
  projectLintResult,
  outputLogger,
}: {
  projectLintResult: ProjectLintResult;
  outputLogger: AbstractOutputLogger;
}) {
  log(
    'elapsedTimeIncludingLinting',
    projectLintResult.elapsedTimeIncludingLinting,
    'elapsedTimeExcludingLinting',
    projectLintResult.elapsedTimeExcludingLinting,
  );

  outputLogger.logToStdout(chalk.magenta(projectLintResult.projectName));
  outputLogger.logToStdout(
    `${chalk.magenta(repeat('-', projectLintResult.projectName.length))}\n`,
  );

  const { numberOfPassing, numberOfFailing } = reportRuleExecutionResultNodes({
    ruleExecutionResultNodes:
      projectLintResult.ruleExecutionResultTree.children,
    outputLogger,
  });

  outputLogger.logToStdout('');

  const numberOfPassingPhrase = `${numberOfPassing} passed`;
  const numberOfFailingPhrase = `${numberOfFailing} failed`;
  outputLogger.logToStdout(
    '%s       %s, %s, %s',
    chalk.bold('Results:'),
    numberOfPassing > 0
      ? chalk.green(numberOfPassingPhrase)
      : numberOfPassingPhrase,
    numberOfFailing > 0
      ? chalk.red(numberOfFailingPhrase)
      : numberOfFailingPhrase,
    `${numberOfPassing + numberOfFailing} total`,
  );

  outputLogger.logToStdout(
    '%s  %s ms',
    chalk.bold('Elapsed time:'),
    projectLintResult.elapsedTimeIncludingLinting,
  );

  return { numberOfPassing, numberOfFailing };
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
}) {
  let numberOfPassing = 0;
  let numberOfFailing = 0;

  for (const ruleExecutionResultNode of ruleExecutionResultNodes) {
    outputLogger.logToStdout(
      `- ${ruleExecutionResultNode.result.ruleDescription} ${
        ruleExecutionResultNode.result.passed ? '✅' : '❌'
      }`,
    );

    if (ruleExecutionResultNode.result.passed) {
      numberOfPassing += 1;
    } else {
      numberOfFailing += 1;

      for (const failure of ruleExecutionResultNode.result.failures) {
        outputLogger.logToStdout(
          indent(`- ${chalk.yellow(failure.message)}`, 1),
        );
      }
    }

    const {
      numberOfPassing: numberOfChildrenPassing,
      numberOfFailing: numberOfChildrenFailing,
    } = reportRuleExecutionResultNodes({
      ruleExecutionResultNodes: ruleExecutionResultNode.children,
      outputLogger,
    });
    numberOfPassing += numberOfChildrenPassing;
    numberOfFailing += numberOfChildrenFailing;
  }

  return { numberOfPassing, numberOfFailing };
}
