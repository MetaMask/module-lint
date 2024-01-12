import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireNvmrc,
  description: 'Is `.nvmrc` present, and conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileConforms('.nvmrc', ruleExecutionArguments);
  },
});
