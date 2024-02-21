import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packagePropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageTypedocDependenciesConform,
  description:
    'Do the typedoc-related `devDependencies` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packagePropertiesConform('devDependencies', ruleExecutionArguments, [
      'typedoc',
    ]);
  },
});
