import { buildRule } from './build-rule';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.ReadmeRecommendsNodeInstall,
  description:
    'Does the README conform by recommending node install from nodejs.org?',
  dependencies: [RuleName.RequireReadme],
  execute: async ({ template, project, pass, fail }) => {
    const entryPath = 'README.md';

    const fileContentInTemplate = await template.fs.readFile(entryPath);
    const fileContentInProject = await project.fs.readFile(entryPath);
    const nodeInstallRecommend =
      'Install the current LTS version of [Node.js](https://nodejs.org)';
    const includes = fileContentInTemplate.includes(nodeInstallRecommend);
    if (!includes) {
      throw new Error(
        "Could not find node install recommendation in template's README. This is not the fault of the project, but is rather a bug in a rule.",
      );
    }
    if (!fileContentInProject.includes(nodeInstallRecommend)) {
      return fail([
        {
          message: `\`README.md\` should contain "${nodeInstallRecommend}", but does not.`,
        },
      ]);
    }
    return pass();
  },
});
