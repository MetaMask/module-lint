import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the `src/` directory exist?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = 'src';
    const stats = await project.fs.getEntryStats(entryPath);
    const passed = stats?.isDirectory();
    const message = stats
      ? `\`${entryPath}\` is not a directory when it should be.`
      : `\`${entryPath}\` exists in the module template, but not in this repo.`;
    const failures = [{ message }];

    return passed ? pass() : fail(failures);
  },
});
