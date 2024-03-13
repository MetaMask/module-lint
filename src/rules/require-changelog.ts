import { buildRule } from './build-rule';
import { RuleName } from './types';
import { fileExists } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireChangelog,
  description: 'Is `CHANGELOG.md` present?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return fileExists('CHANGELOG.md', ruleExecutionArguments);
  },
});
