import { buildRule } from './helpers';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.ReadmeListsCorrectYarnVersion,
  description:
    'Does the README conform by recommending the correct Yarn version to install?',
  dependencies: [RuleName.RequireReadme, RuleName.AllYarnModernFilesConform],
  execute: async ({ template, project, pass, fail }) => {
    const entryPath = 'README.md';

    const fileContentInTemplate = await template.fs.readFile(entryPath);
    const fileContentInProject = await project.fs.readFile(entryPath);

    const match = fileContentInTemplate.match(
      /Install \[Yarn [^[\]]+\]\([^()]+\)/u,
    );
    if (!match?.[0]) {
      throw new Error(
        "Could not find Yarn version in template's README. This is not the fault of the project, but is rather a bug in a rule.",
      );
    }
    if (!fileContentInProject.includes(match[0])) {
      return fail([
        {
          message: `\`README.md\` should contain "${match[0]}", but does not.`,
        },
      ]);
    }
    return pass();
  },
});
