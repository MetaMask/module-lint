import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTestScriptsConform,
  description: 'Do the test-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packageManifestPropertiesConform(
      ['scripts.[test]', 'scripts.[test:watch]'],
      ruleExecutionArguments,
    );
  },
});
