import type { RuleName } from './types';
import type { MetaMaskRepository } from '../establish-metamask-repository';
import type {
  FailedPartialRuleExecutionResult,
  PartialRuleExecutionResult,
  Rule,
  RuleExecutionArguments,
  SuccessfulPartialRuleExecutionResult,
} from '../execute-rules';

/**
 * Rule objects are fairly abstract: the name of a rule and the dependencies of
 * a rule (which are themselves names) can be anything; and unfortunately, we
 * cannot really enforce names, or else it would mean we'd have to have a
 * `RuleName` type everywhere.
 *
 * This function exists to bridge that gap at the point where the rule is
 * actually defined by validating the name and dependencies against a known set
 * of rules.
 *
 * @param args - The arguments to this function.
 * @param args.name - The name of a rule. This function assumes that all rule
 * names are predefined in an enum and that this is one of the values in that
 * enum.
 * @param args.description - The description of the rule. This will show up when
 * listing rules as a part of the lint report for a project.
 * @param args.dependencies - The names of rules that must be executed first
 * before executing this one.
 * @param args.execute - The "body" of the rule.
 * @returns The (validated) rule.
 */
export function buildRule<Name extends RuleName>({
  name,
  description,
  dependencies,
  execute,
}: {
  name: Name;
  description: string;
  dependencies: Exclude<RuleName, Name>[];
  execute(args: {
    template: MetaMaskRepository;
    project: MetaMaskRepository;
    pass: () => SuccessfulPartialRuleExecutionResult;
    fail: (
      failures: FailedPartialRuleExecutionResult['failures'],
    ) => FailedPartialRuleExecutionResult;
  }): Promise<PartialRuleExecutionResult>;
}): Rule {
  return {
    name,
    description,
    dependencies,
    execute,
  };
}

/**
 * A rule utility which determines whether a file exists in the project.
 *
 * @param filePath - The path to test.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function fileExists(
  filePath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { project, pass, fail } = ruleExecutionArguments;
  const stats = await project.fs.getEntryStats(filePath);

  if (!stats) {
    return fail([
      {
        message: `\`${filePath}\` does not exist in this project.`,
      },
    ]);
  }

  if (!stats.isFile()) {
    return fail([
      {
        message: `\`${filePath}\` is not a file when it should be.`,
      },
    ]);
  }

  return pass();
}

/**
 * A rule utility which determines whether a directory exists in the project.
 *
 * @param directoryPath - The path to test.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function directoryExists(
  directoryPath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { project, pass, fail } = ruleExecutionArguments;
  const stats = await project.fs.getEntryStats(directoryPath);

  if (!stats) {
    return fail([
      {
        message: `\`${directoryPath}/\` does not exist in this project.`,
      },
    ]);
  }

  if (!stats.isDirectory()) {
    return fail([
      {
        message: `\`${directoryPath}/\` is not a directory when it should be.`,
      },
    ]);
  }

  return pass();
}

/**
 * A rule utility which determines not only whether a file that's assumed to
 * exist in the template exists in the project as well, but also whether it
 * matches the same file in the template content-wise.
 *
 * @param filePath - The path to a file in both the template and project.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function fileConforms(
  filePath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { template, project, pass, fail } = ruleExecutionArguments;
  const fileExistsResult = await fileExists(filePath, ruleExecutionArguments);
  if (!fileExistsResult.passed) {
    return fileExistsResult;
  }

  const fileContentInTemplate = await template.fs.readFile(filePath);
  const fileContentInProject = await project.fs.readFile(filePath);

  if (fileContentInProject !== fileContentInTemplate) {
    return fail([
      {
        message: [
          `\`${filePath}\` does not match the same file in the template repo.`,
        ].join('\n'),
      },
    ]);
  }
  return pass();
}

/**
 * A rule utility which determines not only whether a directory that's assumed to
 * exist in the template exists in the project as well, but also whether all
 * files in that directory in the template are present in the project and match
 * content-wise.
 *
 * @param directoryPath - The path to a directory in both the template and
 * project.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function directoryConforms(
  directoryPath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { template } = ruleExecutionArguments;
  const directoryExistsResult = await directoryExists(
    directoryPath,
    ruleExecutionArguments,
  );
  if (!directoryExistsResult.passed) {
    return directoryExistsResult;
  }

  const files = await template.fs.readDirectoryRecursively(directoryPath);
  const fileConformsResults = await Promise.all(
    files.map(async (file) => {
      return await fileConforms(file.relativePath, ruleExecutionArguments);
    }),
  );
  return combineRuleExecutionResults(
    fileConformsResults,
    ruleExecutionArguments,
  );
}

/**
 * Encapsulates multiple rule execution results into one. If all of the results
 * are passing, then the combined result will be passing; otherwise, the
 * combined result will be failing, and messages from failing results will be
 * consolidated into a single array.
 *
 * @param results - The rule execution results.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns The combined rule execution result.
 */
export function combineRuleExecutionResults(
  results: PartialRuleExecutionResult[],
  ruleExecutionArguments: RuleExecutionArguments,
): PartialRuleExecutionResult {
  const { pass, fail } = ruleExecutionArguments;
  const failures: FailedPartialRuleExecutionResult['failures'] = [];

  for (const result of results) {
    if (!result.passed) {
      failures.push(...result.failures);
    }
  }

  return failures.length > 0 ? fail(failures) : pass();
}
