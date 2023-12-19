import { buildRule, fileExists } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireReadme,
  description: 'Is `README.md` present?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await fileExists('README.md', ruleExecutionArguments);
  },
});
