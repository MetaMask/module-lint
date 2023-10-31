import { buildRule } from './helpers';
import { RuleName } from './types';
import type { MetaMaskRepository } from '../establish-metamask-repository';
import type { RuleExecutionFailure } from '../execute-rules';

export default buildRule({
  name: RuleName.ComplyYarn,
  description: 'Does the `yarn` comply?',
  dependencies: [],
  execute: async ({ project, template, pass, fail }) => {
    const failures: RuleExecutionFailure[] = [];
    await complyYarnPackageManager(project, template, failures);

    return failures.length === 0 ? pass() : fail(failures);
  },
});

/**
 * Verifies whether packageManager field in package.json exist and matches the same in module template.
 *
 * @param project - The project repository to execute the rules against.
 * @param template - The template repository to compare the project to.
 * @param failures - The array of failures from executing the rule.
 */
async function complyYarnPackageManager(
  project: MetaMaskRepository,
  template: MetaMaskRepository,
  failures: RuleExecutionFailure[],
) {
  const entryPath = 'package.json';

  // packageManager from project repo
  const packageJson = await project.fs.readJsonFile(entryPath);
  const packageManager: string = packageJson?.packageManager;

  // packageManager from template-module repo
  const templatePackageJson = await template.fs.readJsonFile(entryPath);
  const templatePackageManager: string = templatePackageJson?.packageManager;

  if (packageManager?.includes('yarn')) {
    if (packageManager !== templatePackageManager) {
      failures.push({
        message: `\`${packageManager}\` does not match module template \`${templatePackageManager}\``,
      });
    }
  } else {
    failures.push({ message: 'yarn doesn not exist' });
  }
}
