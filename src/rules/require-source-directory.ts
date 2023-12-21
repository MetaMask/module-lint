import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the `src/` directory exist?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = 'src';

    const stats = await project.fs.getEntryStats(entryPath);

    if (!stats) {
      return fail([{ message: `\`${entryPath}/\` does not exist in this project.` }]);
    } else if (!stats.isDirectory()) {
      return fail([{ message: `\`${entryPath}/\` is not a directory when it should be.` }]);
    }

    return pass();
  },
});
