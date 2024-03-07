import { validateChangelog } from '@metamask/auto-changelog';
import { isErrorWithCode } from '@metamask/utils/node';

import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';

export default buildRule({
  name: RuleName.ValidateChangelog,
  description: 'Is `CHANGELOG.md` well-formatted?',
  dependencies: [RuleName.RequireChangelog],
  execute: async (ruleExecutionArguments) => {
    const { project, pass, fail } = ruleExecutionArguments;
    const oldChangelog = await project.fs.readFile('CHANGELOG.md');
    try {
      const projectManifest = await project.fs.readJsonFileAs(
        'package.json',
        PackageManifestSchema,
      );

      validateChangelog({
        changelogContent: oldChangelog,
        currentVersion: projectManifest.version,
        repoUrl: projectManifest.repository.url.replace('.git', ''),
        isReleaseCandidate: false,
      });
      return pass();
    } catch (error) {
      if (isErrorWithCode(error) && error.code === 'ERR_INVALID_JSON_FILE') {
        return fail([
          {
            message: `The package does not have a well-formed manifest. This is not the fault of the changelog, but this rule requires a valid package manifest.`,
          },
        ]);
      }
      return fail([
        {
          message: 'Changelog is not well-formatted.',
        },
      ]);
    }
  },
});
