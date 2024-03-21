import { get, has } from 'lodash';

import { buildRule } from './build-rule';
import { RuleName, YarnrcSchema } from './types';

export default buildRule({
  name: RuleName.PackageAllowScriptsYarnConforms,
  description: 'Does allow scripts conforms to yarn?',
  dependencies: [],
  execute: async ({ project, pass, fail }) => {
    const entryPath = '.yarnrc.yml';
    const stats = await project.fs.getEntryStats(entryPath);
    if (stats) {
      const yarnrc = await project.fs.readYamlFileAs(entryPath, YarnrcSchema);
      return has(yarnrc, 'enableScripts') && !get(yarnrc, 'enableScripts')
        ? pass()
        : fail([
            {
              message: `\`${entryPath}\` should list \`'enableScripts': false\`, but does not.`,
            },
          ]);
    }
    return pass();
  },
});
