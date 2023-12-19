import {
  buildRule,
  combineRuleExecutionResults,
  directoryConforms,
  fileConforms,
} from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.AllYarnModernFilesConform,
  description:
    'Are all of the files for Yarn Modern present, and do they conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    const results = await Promise.all([
      fileConforms('.yarnrc.yml', ruleExecutionArguments),
      directoryConforms('.yarn/releases', ruleExecutionArguments),
      directoryConforms('.yarn/plugins', ruleExecutionArguments),
    ]);

    return combineRuleExecutionResults(results, ruleExecutionArguments);
  },
});
