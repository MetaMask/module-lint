import { buildRule } from './build-rule';
import { RuleName } from './types';
import {
  combineRuleExecutionResults,
  directoryAndContentsConform,
  fileConforms,
} from '../rule-helpers';

export default buildRule({
  name: RuleName.AllYarnModernFilesConform,
  description:
    'Are all of the files for Yarn Modern present, and do they conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    const results = await Promise.all([
      fileConforms('.yarnrc.yml', ruleExecutionArguments),
      directoryAndContentsConform('.yarn/releases', ruleExecutionArguments),
      directoryAndContentsConform('.yarn/plugins', ruleExecutionArguments),
    ]);

    return combineRuleExecutionResults(results);
  },
});
