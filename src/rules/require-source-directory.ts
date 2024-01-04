import { buildRule } from './build-rule';
import { RuleName } from './types';
import { directoryExists } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the `src/` directory exist?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await directoryExists('src', ruleExecutionArguments);
  },
});
