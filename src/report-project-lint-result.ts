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

  outputLogger.logToStdout(
    `Linted project in ${chalk.blue(
      projectLintResult.elapsedTimeIncludingLinting,
    )} ms.\n`,
  );

  reportRuleExecutionResultNodes({
    ruleExecutionResultNodes:
      projectLintResult.ruleExecutionResultTree.children,
    outputLogger,
  });
}

/**
 * Prints the results from rules executed against a project. These results are
 * organized in a tree structure just like their rules, so they will be
 * displayed in the same structure. This function is recursive, as each rule
 * execution result node may have children.
 *
 * @param args - The arguments to this function.
 * @param args.ruleExecutionResultNodes - The nodes within the rule execution
 * result tree.
 * @param args.level - The level in the tree we are currently at (this governed
 * how the results are indented as they are displayed).
 * @param args.outputLogger - Writable streams for output messages.
 */
function reportRuleExecutionResultNodes({
  ruleExecutionResultNodes,
  level = 0,
  outputLogger,
}: {
  ruleExecutionResultNodes: RuleExecutionResultNode[];
  level?: number;
  outputLogger: AbstractOutputLogger;
}) {
  for (const ruleExecutionResultNode of ruleExecutionResultNodes) {
    outputLogger.logToStdout(
      indent(
        `- ${ruleExecutionResultNode.result.ruleDescription} ${
          ruleExecutionResultNode.result.passed ? '✅' : '❌'
        }`,
        level,
      ),
    );
    if ('failures' in ruleExecutionResultNode.result) {
      for (const failure of ruleExecutionResultNode.result.failures) {
        outputLogger.logToStdout(
          indent(`- ${chalk.yellow(failure.message)}`, level + 1),
        );
      }
    }

    reportRuleExecutionResultNodes({
      ruleExecutionResultNodes: ruleExecutionResultNode.children,
      level: level + 1,
      outputLogger,
    });
  }
}
