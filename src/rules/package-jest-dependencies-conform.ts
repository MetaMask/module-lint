import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.PackageJestDependenciesConform,
  description:
    'Do the jest-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async ({ project, template, pass, fail }) => {
    const entryPath = 'package.json';

    const templateManifest = await template.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );

    const projectManifest = await project.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );

    const failures: RuleExecutionFailure[] = await jestConform(
      templateManifest.devDependencies,
      projectManifest.devDependencies,
    );

    return failures.length === 0 ? pass() : fail(failures);
  },
});

/**
 * Validates whether target project has all the required jest packages with versions matching with template project.
 *
 * @param templateDependencies - The record of jest package name and version from template.
 * @param projectDependencies - The record of jest package name and version from project.
 */
async function jestConform(
  templateDependencies: Record<string, string>,
  projectDependencies: Record<string, string>,
): Promise<RuleExecutionFailure[]> {
  const jestPackagesRequired = ['jest', 'jest-it-up'];
  const failures: RuleExecutionFailure[] = [];
  for (const jestPackage of jestPackagesRequired) {
    const templatePackageVersion = templateDependencies[jestPackage];
    if (!templatePackageVersion) {
      throw new Error(
        `Could not find "${jestPackage}" in \`devDependencies\` of template's package.json. This is not the fault of the project, but is rather a bug in a rule.`,
      );
    }

    const projectPackageVersion = projectDependencies[jestPackage];
    if (!projectPackageVersion) {
      failures.push({
        message: `\`package.json\` should list \`"${jestPackage}": "${templatePackageVersion}"\` in \`devDependencies\`, but does not.`,
      });

      continue;
    }

    if (projectPackageVersion !== templatePackageVersion) {
      failures.push({
        message: `\`${jestPackage}\` is "${projectPackageVersion}", when it should be "${templatePackageVersion}".`,
      });
    }
  }

  return failures;
}
