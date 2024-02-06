import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.PackageJestScriptsConform,
  description: 'Do the jest-related `scripts` in `package.json` conform?',
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
      templateManifest.scripts,
      projectManifest.scripts,
    );

    return failures.length === 0 ? pass() : fail(failures);
  },
});

/**
 * Validates whether target project has all the required jest scripts matching with template project.
 *
 * @param templateScripts - The record of key and value from template scripts.
 * @param projectScripts - The record of key and value from project scripts.
 */
async function jestConform(
  templateScripts: Record<string, string>,
  projectScripts: Record<string, string>,
): Promise<RuleExecutionFailure[]> {
  const jestScriptsRequired = ['test', 'test:watch'];
  const failures: RuleExecutionFailure[] = [];
  for (const jestScriptKey of jestScriptsRequired) {
    const templateScript = templateScripts[jestScriptKey];
    if (!templateScript) {
      throw new Error(
        `Could not find "${jestScriptKey}" in \`scripts\` of template's package.json. This is not the fault of the project, but is rather a bug in a rule.`,
      );
    }

    const projectScript = projectScripts[jestScriptKey];
    if (!projectScript) {
      failures.push({
        message: `\`package.json\` should list \`"${jestScriptKey}": "${templateScript}"\` in \`scripts\`, but does not.`,
      });

      continue;
    }

    if (projectScript !== templateScript) {
      failures.push({
        message: `\`${jestScriptKey}\` is "${projectScript}", when it should be "${templateScript}".`,
      });
    }
  }

  return failures;
}
