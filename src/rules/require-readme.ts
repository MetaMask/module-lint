import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireREADME,
  description: 'Does the `README.md` file exist?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = 'README.md';
    const stats = await project.fs.getEntryStats(entryPath);
    const passed = stats?.isFile();

    return passed
      ? pass()
      : fail([
          {
            message: `\`${entryPath}\` exists in the module template, but not in this repo.`,
          },
        ]);
  },
});
