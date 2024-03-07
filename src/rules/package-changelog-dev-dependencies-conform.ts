import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageChangelogDependenciesConform,
  description:
    'Do the changelog-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packageManifestPropertiesConform(
      ['devDependencies.[@metamask/auto-changelog]'],
      ruleExecutionArguments,
    );
  },
});
