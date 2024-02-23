import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageModuleFieldConforms,
  description: 'Does the `module` field in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packageManifestPropertiesConform(['module'], ruleExecutionArguments);
  },
});
