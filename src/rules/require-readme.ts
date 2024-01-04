import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileExists } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireReadme,
  description: 'Is `README.md` present?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileExists('README.md', ruleExecutionArguments);
  },
});
