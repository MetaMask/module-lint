import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypedocScriptsConform,
  description: 'Do the typedoc-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return await packagePropertiesConform('scripts', ruleExecutionArguments, [
      'build:docs',
    ]);
  },
});
