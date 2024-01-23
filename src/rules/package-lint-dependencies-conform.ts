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
  const templateLintPackages = getTemplateLintPackages(templateDependencies);
  const failures: RuleExecutionFailure[] = [];
  for (const [templatePackageName, templatePackageVersion] of Object.entries(
    templateLintPackages,
  )) {
    const projectPackageVersion = projectDependencies[templatePackageName];
    if (!projectPackageVersion) {
      failures.push({
        message: `\`package.json\` should list \`"${templatePackageName}": "${templatePackageVersion}"\` in \`devDependencies\`, but does not.`,
      });

      continue;
    }

    if (projectPackageVersion !== templatePackageVersion) {
      failures.push({
        message: `\`${templatePackageName}\` is "${projectPackageVersion}", when it should be "${templatePackageVersion}".`,
      });
    }
  }

  return failures;
}

/**
 * Extracts the records of lint package name and version from template's package.json.
 *
 * @param templateDependencies - The record of lint package name and version.
 * @returns The records of lint package name and version.
 */
function getTemplateLintPackages(
  templateDependencies: Record<string, string>,
): Record<string, string> {
  const requiredPackagePatterns: RegExp[] = [
    /^@metamask\/eslint-config-[^/]+$/u,
    /^@typescript-eslint\/[^/]+$/u,
    /^eslint(-[^/]+)?$/u,
    /^prettier(-[^/]+)?$/u,
  ];
  return Object.entries(templateDependencies).reduce<Record<string, string>>(
    (packages, [packageName, packageVersion]) => {
      if (
        requiredPackagePatterns.some((pattern) => packageName.match(pattern))
      ) {
        return { ...packages, [packageName]: packageVersion };
      }
      return packages;
    },
    {},
  );
}
