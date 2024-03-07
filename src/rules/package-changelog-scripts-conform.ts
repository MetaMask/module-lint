import { get, has } from 'lodash';

import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import {
  combineRuleExecutionResults,
  packageManifestPropertiesConform,
} from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageChangelogScriptsConform,
  description: 'Do the changelog-related `scripts` in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    // check: project contains the same `lint:changelog` package script as in the module template
    const result = await packageManifestPropertiesConform(
      ['scripts.[lint:changelog]'],
      ruleExecutionArguments,
    );

    // check: If the `lint` script exists, then the `lint` script contains `yarn lint:changelog`
    const { project, pass, fail } = ruleExecutionArguments;
    const projectManifest = await project.fs.readJsonFileAs(
      'package.json',
      PackageManifestSchema,
    );
    if (has(projectManifest.scripts, 'lint')) {
      const lintScripts = get(projectManifest.scripts, 'lint');
      const lintResult = lintScripts.match(/\byarn lint:changelog\b/u)
        ? pass()
        : fail([
            {
              message:
                '`scripts.[lint]` exists, but it does not exactly match `yarn lint:changelog`.',
            },
          ]);
      return combineRuleExecutionResults([result, lintResult]);
    }

    return result;
  },
});
