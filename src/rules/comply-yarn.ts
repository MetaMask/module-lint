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
    await complyYarnPluginAllowScripts(project, template, failures);
    await complyYarnPluginConstraints(project, template, failures);

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

/**
 * Verifies whether plugin-allow-scripts.cjs file exist and matches the same in module template.
 *
 * @param project - The project repository to execute the rules against.
 * @param template - The template repository to compare the project to.
 * @param failures - The array of failures from executing the rule.
 */
async function complyYarnPluginAllowScripts(
  project: MetaMaskRepository,
  template: MetaMaskRepository,
  failures: RuleExecutionFailure[],
) {
  const entryPath = '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs';
  const projectFile = await project.fs.readFile(entryPath);
  const templateFile = await template.fs.readFile(entryPath);

  if (projectFile) {
    if (projectFile !== templateFile) {
      failures.push({
        message:
          'plugin-allow-scripts.cjs does not match the same in module template',
      });
    }
  } else {
    failures.push({ message: 'plugin-allow-scripts.cjs doesn not exist' });
  }
}

/**
 * Verifies whether plugin-constraints.cjs file exist and matches the same in module template.
 *
 * @param project - The project repository to execute the rules against.
 * @param template - The template repository to compare the project to.
 * @param failures - The array of failures from executing the rule.
 */
async function complyYarnPluginConstraints(
  project: MetaMaskRepository,
  template: MetaMaskRepository,
  failures: RuleExecutionFailure[],
) {
  const entryPath = '.yarn/plugins/@yarnpkg/plugin-constraints.cjs';
  const projectFile = await project.fs.readFile(entryPath);
  const templateFile = await template.fs.readFile(entryPath);

  if (projectFile) {
    if (projectFile !== templateFile) {
      failures.push({
        message:
          'plugin-constraints.cjs does not match the same in module template',
      });
    }
  } else {
    failures.push({ message: 'plugin-constraints.cjs doesn not exist' });
  }
}
