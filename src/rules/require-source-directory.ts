import { buildRule, directoryExists } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the `src/` directory exist?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    return await directoryExists('src', ruleExecutionArguments);
  },
});
