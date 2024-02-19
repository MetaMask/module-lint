import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypescriptScriptsConform,
  description: 'Do the typescript-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    const requiredScripts = ['build', 'build:types'];
    return await packagePropertiesConform(
      'scripts',
      ruleExecutionArguments,
      requiredScripts,
    );
  },
});
