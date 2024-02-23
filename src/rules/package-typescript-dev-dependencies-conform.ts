import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypescriptDependenciesConform,
  description:
    'Do the typescript-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    const requiredPackages = [
      'devDependencies.[@types/node]',
      'devDependencies.[ts-node]',
      'devDependencies.[tsup]',
      'devDependencies.[typescript]',
    ];
    return packageManifestPropertiesConform(
      requiredPackages,
      ruleExecutionArguments,
    );
  },
});
