import { buildRule } from './helpers';
import { RuleName } from './types';
import { fail, pass } from '../execute-rules';

export default buildRule({
  name: RuleName.ClassicYarnConfigFileAbsent,
  description: 'Is the classic Yarn config file (`.yarnrc`) absent?',
  dependencies: [],
  execute: async ({ project }) => {
    const entryPath = '.yarnrc';

    const stats = await project.fs.getEntryStats(entryPath);
    if (stats) {
      return fail([
        {
          message: `The config file for Yarn Classic, \`${entryPath}\`, is present. Please upgrade this project to Yarn Modern.`,
        },
      ]);
    }
    return pass();
  },
});
