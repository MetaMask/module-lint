import { isEqual, get, has, isMatch, isObject } from 'lodash';
import { inspect } from 'util';

import type {
  SuccessfulPartialRuleExecutionResult,
  FailedPartialRuleExecutionResult,
  PartialRuleExecutionResult,
  RuleExecutionArguments,
  RuleExecutionFailure,
  ErroredPartialRuleExecutionResult,
} from './execute-rules';
import { RuleExecutionStatus } from './execute-rules';
import { PackageManifestSchema } from './rules/types';

/**
 * A utility for a rule which ends its execution by marking it as passing.
 *
 * @returns Part of a successful rule execution result (the rest will be filled
 * in automatically).
 */
export function pass(): SuccessfulPartialRuleExecutionResult {
  return {
    status: RuleExecutionStatus.Passed,
  };
}

/**
 * A utility for a rule which ends its execution by marking it as failing.
 *
 * @param failures - The list of associated failures.
 * @returns Part of a failed rule execution result (the rest will be filled
 * in automatically).
 */
export function fail(
  failures: FailedPartialRuleExecutionResult['failures'],
): FailedPartialRuleExecutionResult {
  return {
    status: RuleExecutionStatus.Failed,
    failures,
  };
}

/**
 * A utility for a rule which ends its execution by marking it as having
 * errored.
 *
 * @param capturedError - The error to include in the execution result object.
 * @returns Part of an errored rule execution result (the rest will be filled
 * in automatically).
 */
export function error(
  capturedError: unknown,
): ErroredPartialRuleExecutionResult {
  return {
    status: RuleExecutionStatus.Errored,
    error: capturedError,
  };
}

/**
 * A utility which encapsulates multiple rule execution results into one. If any
 * of the results have errored, then the combined result will have errored, and
 * the first error wins; if any of the results have failed, the combined result
 * will have failed, and failures will be consolidated; otherwise the combined
 * result will have passed.
 *
 * @param results - The rule execution results.
 * @returns The combined rule execution result.
 */
export function combineRuleExecutionResults(
  results: PartialRuleExecutionResult[],
): PartialRuleExecutionResult {
  let caughtError: unknown;
  const failures: FailedPartialRuleExecutionResult['failures'] = [];

  for (const result of results) {
    if (result.status === RuleExecutionStatus.Errored) {
      if (caughtError === undefined) {
        caughtError = result.error;
      }
    } else if (result.status === RuleExecutionStatus.Failed) {
      failures.push(...result.failures);
    }
  }

  if (caughtError) {
    return error(caughtError);
  } else if (failures.length > 0) {
    return fail(failures);
  }
  return pass();
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
  if (fileExistsResult.status !== RuleExecutionStatus.Passed) {
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
export async function directoryAndContentsConform(
  directoryPath: string,
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { template } = ruleExecutionArguments;
  const directoryExistsResult = await directoryExists(
    directoryPath,
    ruleExecutionArguments,
  );
  if (directoryExistsResult.status !== RuleExecutionStatus.Passed) {
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
 * Verifies whether project has the required property name/s and with it's value equivalent to the same in template project.
 *
 * @param propertyPaths - The array of property names to be verified.
 * @param ruleExecutionArguments - Rule execution arguments.
 */
export async function packageManifestPropertiesConform(
  propertyPaths: string[],
  ruleExecutionArguments: RuleExecutionArguments,
): Promise<PartialRuleExecutionResult> {
  const { template, project } = ruleExecutionArguments;
  const entryPath = 'package.json';
  const templateManifest = await template.fs.readJsonFileAs(
    entryPath,
    PackageManifestSchema,
  );

  const projectManifest = await project.fs.readJsonFileAs(
    entryPath,
    PackageManifestSchema,
  );

  const conformsResults = propertyPaths.map((propertyPath) => {
    return dataConform(
      templateManifest,
      projectManifest,
      propertyPath,
      entryPath,
    );
  });
  return combineRuleExecutionResults(conformsResults);
}

/**
 * Performs a deep comparison between template data and project data to determine if they are equivalent.
 * In case of equals, it returns undefined, otherwise failure message.
 *
 * @param referenceObject - Reference object.
 * @param targetObject - The object to be compared with reference object.
 * @param propertyPath - Path of the property.
 * @param entryPath - The path to the file from which schema is prepared.
 * @returns PartialRuleExecutionResult.
 */
export function dataConform<Schema>(
  referenceObject: Schema,
  targetObject: Schema,
  propertyPath: string,
  entryPath: string,
): PartialRuleExecutionResult {
  if (!has(referenceObject, propertyPath)) {
    throw new Error(
      `Could not find \`${propertyPath}\` in reference \`${entryPath}\`. This is not the fault of the target \`${entryPath}\`, but is rather a bug in a rule.`,
    );
  }

  const referenceValue = get(referenceObject, propertyPath);
  let failure: RuleExecutionFailure | undefined;
  if (has(targetObject, propertyPath)) {
    const targetValue = get(targetObject, propertyPath);
    const isPassed =
      isObject(targetValue) && isObject(referenceValue)
        ? isMatch(targetValue, referenceValue)
        : isEqual(targetValue, referenceValue);

    if (!isPassed) {
      failure = {
        message: `\`${propertyPath}\` is ${inspect(
          targetValue,
        )}, when it should be ${inspect(referenceValue)}.`,
      };
    }
  } else {
    failure = {
      message: `\`${entryPath}\` should list \`'${propertyPath}': ${inspect(
        referenceValue,
      )}\`, but does not.`,
    };
  }

  return failure ? fail([failure]) : pass();
}
