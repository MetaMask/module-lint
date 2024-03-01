import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireTsConfigBuild,
  description: 'Is `tsconfig.build.json` present, and does it conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileConforms('tsconfig.build.json', ruleExecutionArguments);
  },
});
