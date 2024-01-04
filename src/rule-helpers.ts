import type {
  SuccessfulPartialRuleExecutionResult,
  FailedPartialRuleExecutionResult,
  PartialRuleExecutionResult,
  RuleExecutionArguments,
} from './execute-rules';

/**
 * A helper for a rule which is intended to end its execution by marking it as
 * passing.
 *
 * @returns Part of a successful rule execution result (the rest will be filled
 * in automatically).
 */
export function pass(): SuccessfulPartialRuleExecutionResult {
  return {
    passed: true,
  };
}

/**
 * A helper for a rule which is intended to end its execution by marking it as
 * failing.
 *
 * @param failures - The list of associated failures.
 * @returns Part of a failed rule execution result (the rest will be filled
 * in automatically).
 */
export function fail(
  failures: FailedPartialRuleExecutionResult['failures'],
): FailedPartialRuleExecutionResult {
  return { passed: false, failures };
}

/**
 * A helper for a rule which determines whether a file exists in the project.
 *
 * @param filePath - The path to test.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function fileExists(
  filePath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { project } = ruleExecutionArguments;
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
 * A helper for a rule which determines whether a directory exists in the
 * project.
 *
 * @param directoryPath - The path to test.
 * @param ruleExecutionArguments - Rule execution arguments.
 * @returns Either a successful or failed result.
 */
export async function directoryExists(
  directoryPath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { project } = ruleExecutionArguments;
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
 * A helper for a rule which determines not only whether a file that's assumed
 * to exist in the template exists in the project as well, but also whether it
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
  const { template, project } = ruleExecutionArguments;
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
 * A helper for a rule which determines not only whether a directory that's
 * assumed to exist in the template exists in the project as well, but also
 * whether all files in that directory in the template are present in the
 * project and match content-wise.
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
  return combineRuleExecutionResults(fileConformsResults);
}

/**
 * A utility which encapsulates multiple rule execution results into one. If all
 * of the results are passing, then the combined result will be passing;
 * otherwise, the combined result will be failing, and messages from failing
 * results will be consolidated into a single array.
 *
 * @param results - The rule execution results.
 * @returns The combined rule execution result.
 */
export function combineRuleExecutionResults(
  results: PartialRuleExecutionResult[],
): PartialRuleExecutionResult {
  const failures: FailedPartialRuleExecutionResult['failures'] = [];

  for (const result of results) {
    if (!result.passed) {
      failures.push(...result.failures);
    }
  }

  return failures.length > 0 ? fail(failures) : pass();
}
