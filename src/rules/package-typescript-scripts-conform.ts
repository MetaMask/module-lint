import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypescriptScriptsConform,
  description: 'Do the typescript-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return await packageManifestPropertiesConform(
      ['scripts.[build]', 'scripts.[build:types]'],
      ruleExecutionArguments,
    );
  },
});
