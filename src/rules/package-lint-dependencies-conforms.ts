import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.PackageLintDependenciesConforms,
  description:
    'Does the lint related `devDependencies` in `package.json` conform?',
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

    const templateDependenciesMap = new Map<string, string>(
      Object.entries(templateManifest.devDependencies),
    );
    const projectDependenciesMap = new Map<string, string>(
      Object.entries(projectManifest.devDependencies),
    );
    const failMessages: RuleExecutionFailure[] = await lintPackageConforms(
      templateDependenciesMap,
      projectDependenciesMap,
    );

    return failMessages.length === 0 ? pass() : fail(failMessages);
  },
});

/**
 * Validates whether target project has all the required lint packages with versions matching with template project.
 *
 * @param templateDependenciesMap - The map of lint package name and version from template.
 * @param projectDependenciesMap - The map of lint package name and version from project.
 */
async function lintPackageConforms(
  templateDependenciesMap: Map<string, string>,
  projectDependenciesMap: Map<string, string>,
): Promise<RuleExecutionFailure[]> {
  const templateLintPackageNames = await getTemplateLintPackageNames(
    templateDependenciesMap,
  );
  const failMessages: RuleExecutionFailure[] = [];
  for (const lintPackage of new Set<string>(templateLintPackageNames)) {
    const projectPackageVersion = projectDependenciesMap.get(lintPackage);
    if (!projectPackageVersion) {
      failMessages.push({
        message: `\`package.json\` should contain "${lintPackage}", but does not.`,
      });

      continue;
    }

    const templatePackageVersion = templateDependenciesMap.get(lintPackage);
    if (projectPackageVersion !== templatePackageVersion) {
      failMessages.push({
        message: `${lintPackage} version is "${projectPackageVersion}", when it should be "${
          templatePackageVersion as string
        }".`,
      });
    }
  }

  return failMessages;
}

/**
 * Extracts list of lint package names from template's package.json.
 *
 * @param templateDependenciesMap - The map of lint package name and version.
 */
async function getTemplateLintPackageNames(
  templateDependenciesMap: Map<string, string>,
): Promise<string[]> {
  const requiredPackagePatterns: string[] = [
    '@metamask/eslint-config*',
    '@typescript-eslint*',
    'eslint*',
    'prettier*',
  ];

  const templatePackangeNames: string[] = Array.from(
    templateDependenciesMap.keys(),
  );
  const templateLintPackageNames: string[] = [];
  requiredPackagePatterns.forEach((requiredPackage) => {
    templateLintPackageNames.push(
      ...templatePackangeNames.filter((packageName) =>
        packageName.match(requiredPackage),
      ),
    );
  });

  return templateLintPackageNames;
}
