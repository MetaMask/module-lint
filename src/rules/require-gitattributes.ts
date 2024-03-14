import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireGitAttributes,
  description: 'Is `.gitattributes` present, and does it conform?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileConforms('.gitattributes', ruleExecutionArguments);
  },
});
