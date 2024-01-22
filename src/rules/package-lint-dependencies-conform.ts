import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.PackageLintDependenciesConform,
  description:
    'Do the lint-related `devDependencies` in `package.json` conform?',
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

    const failures: RuleExecutionFailure[] = await lintPackageConform(
      templateManifest.devDependencies,
      projectManifest.devDependencies,
    );

    return failures.length === 0 ? pass() : fail(failures);
  },
});

/**
 * Validates whether target project has all the required lint packages with versions matching with template project.
 *
 * @param templateDependencies - The record of lint package name and version from template.
 * @param projectDependencies - The record of lint package name and version from project.
 */
async function lintPackageConform(
  templateDependencies: Record<string, string>,
  projectDependencies: Record<string, string>,
): Promise<RuleExecutionFailure[]> {
  const templateLintPackageNames =
    getTemplateLintPackageNames(templateDependencies);
  const failures: RuleExecutionFailure[] = [];
  for (const lintPackage of templateLintPackageNames) {
    const projectPackageVersion = projectDependencies[lintPackage];
    const templatePackageVersion = templateDependencies[lintPackage] as string;
    if (!projectPackageVersion) {
      failures.push({
        message: `\`package.json\` should list \`"${lintPackage}": "${templatePackageVersion}"\` in \`devDependencies\`, but does not.`,
      });

      continue;
    }

    if (projectPackageVersion !== templatePackageVersion) {
      failures.push({
        message: `${lintPackage} version is "${projectPackageVersion}", when it should be "${templatePackageVersion}".`,
      });
    }
  }

  return failures;
}

/**
 * Extracts array of lint package names from template's package.json.
 *
 * @param templateDependencies - The record of lint package name and version.
 * @returns The array of lint package names.
 */
function getTemplateLintPackageNames(
  templateDependencies: Record<string, string>,
): string[] {
  const requiredPackagePatterns: RegExp[] = [
    /^@metamask\/eslint-config-[^/]+$/u,
    /^@typescript-eslint\/[^/]+$/u,
    /^eslint(-[^/]+)?$/u,
    /^prettier(-[^/]+)?$/u,
  ];

  const templatePackageNames = Object.keys(templateDependencies);
  return templatePackageNames.filter((packageName) => {
    return requiredPackagePatterns.some((pattern) => {
      return packageName.match(pattern);
    });
  });
}
