import { get } from 'lodash';

import { buildRule } from './build-rule';
import { RuleName, YarnrcSchema } from './types';
import { combineRuleExecutionResults, fileConforms } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageAllowScriptsYarnPluginsConforms,
  description: 'Does yarn plugins conforms to allow scripts?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    const entryPath = '.yarnrc.yml';
    const { project, pass, fail } = ruleExecutionArguments;
    const stats = await project.fs.getEntryStats(entryPath);
    if (stats) {
      const partialResult = await fileConforms(
        '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs',
        ruleExecutionArguments,
      );

      const yarnrc = await project.fs.readYamlFileAs(entryPath, YarnrcSchema);
      const pluginPartialResult = yarnrc.plugins.some(
        (plugin) =>
          get(plugin, 'path') ===
            '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs' &&
          get(plugin, 'spec') ===
            'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js',
      )
        ? pass()
        : fail([
            {
              message: `\`${entryPath}\` should list \`'path': '.yarn/plugins/@yarnpkg/plugin-allow-scripts.cjs' \n 'spec': 'https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js'\` in plugins, but does not.`,
            },
          ]);
      return combineRuleExecutionResults([partialResult, pluginPartialResult]);
    }
    return pass();
  },
});
