import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageLavamoatDependenciesConform,
  description:
    'Do the lavamoat-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packageManifestPropertiesConform(
      [
        'devDependencies.[@lavamoat/allow-scripts]',
        'devDependencies.[@lavamoat/preinstall-always-fail]',
      ],
      ruleExecutionArguments,
    );
  },
});
