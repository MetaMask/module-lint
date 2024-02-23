import { buildRule } from './build-rule';
import { RuleName } from './types';
import { packageManifestPropertiesConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageFilesFieldConforms,
  description: 'Do the `files` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    return packageManifestPropertiesConform(['files'], ruleExecutionArguments);
  },
});
