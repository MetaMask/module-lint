import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequirePackageJson,
  description: 'Does the `package.json` exist?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = 'package.json';
    const stats = await project.fs.getEntryStats(entryPath);
    const passed = stats?.isFile();
    const message = stats
      ? `\`${entryPath}\` is not a file when it should be.`
      : `\`${entryPath}\` exists in the module template, but not in this repo.`;
    const failures = [{ message }];

    return passed ? pass() : fail(failures);
  },
});
