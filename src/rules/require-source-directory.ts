import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the `src/` directory exist?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = 'src';

    const stats = await project.fs.getEntryStats(entryPath);

    if (stats?.isDirectory()) {
      return pass();
    }

    const message =
      stats && !stats.isDirectory()
        ? `\`${entryPath}/\` is not a directory when it should be.`
        : `\`${entryPath}/\` does not exist in this project.`;
    const failures = [{ message }];
    return fail(failures);
  },
});
