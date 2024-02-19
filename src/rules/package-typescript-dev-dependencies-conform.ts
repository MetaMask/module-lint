import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypescriptDependenciesConform,
  description:
    'Do the typescript-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    const requiredPackages = ['@types/node', 'ts-node', 'tsup', 'typescript'];
    return packagePropertiesConform(
      'devDependencies',
      ruleExecutionArguments,
      requiredPackages,
    );
  },
});
