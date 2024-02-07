import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.PackageTestScriptsConform,
  description: 'Do the test-related `scripts` in `package.json` conform?',
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

    const failures: RuleExecutionFailure[] = await testConform(
      templateManifest.scripts,
      projectManifest.scripts,
    );

    return failures.length === 0 ? pass() : fail(failures);
  },
});

/**
 * Validates whether target project has all the required test scripts matching with template project.
 *
 * @param templateScripts - The record of key and value from template scripts.
 * @param projectScripts - The record of key and value from project scripts.
 */
async function testConform(
  templateScripts: Record<string, string>,
  projectScripts: Record<string, string>,
): Promise<RuleExecutionFailure[]> {
  const testScriptsRequired = ['test', 'test:watch'];
  const failures: RuleExecutionFailure[] = [];
  for (const testScriptKey of testScriptsRequired) {
    const templateScript = templateScripts[testScriptKey];
    if (!templateScript) {
      throw new Error(
        `Could not find "${testScriptKey}" in \`scripts\` of template's package.json. This is not the fault of the project, but is rather a bug in a rule.`,
      );
    }

    const projectScript = projectScripts[testScriptKey];
    if (!projectScript) {
      failures.push({
        message: `\`package.json\` should list \`"${testScriptKey}": "${templateScript}"\` in \`scripts\`, but does not.`,
      });

      continue;
    }

    if (projectScript !== templateScript) {
      failures.push({
        message: `\`${testScriptKey}\` is "${projectScript}", when it should be "${templateScript}".`,
      });
    }
  }

  return failures;
}
