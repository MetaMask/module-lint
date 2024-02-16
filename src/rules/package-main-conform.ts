import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageMainConform,
  description: 'Do the `main` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packagePropertiesConform('main', ruleExecutionArguments);
  },
});
