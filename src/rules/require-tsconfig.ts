import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireTsConfig,
  description: 'Is `tsconfig.json` present, and does it conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileConforms('tsconfig.json', ruleExecutionArguments);
  },
});
