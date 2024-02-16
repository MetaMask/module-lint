import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTestScriptsConform,
  description: 'Do the test-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packagePropertiesConform('scripts', ruleExecutionArguments, [
      'test',
      'test:watch',
    ]);
  },
});
