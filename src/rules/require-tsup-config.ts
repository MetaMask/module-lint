import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireTsupConfig,
  description: 'Is `tsup.config.ts` present, and does it conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileConforms('tsup.config.ts', ruleExecutionArguments);
  },
});
