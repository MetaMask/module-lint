import {
  ChangelogFormattingError,
  validateChangelog,
} from '@metamask/auto-changelog';
import {
  getErrorMessage,
  isErrorWithCode,
  isErrorWithMessage,
} from '@metamask/utils/node';

import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';

export default buildRule({
  name: RuleName.RequireValidChangelog,
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
      if (
        isErrorWithCode(error) &&
        isErrorWithMessage(error) &&
        error.code === 'ERR_INVALID_JSON_FILE'
      ) {
        throw new Error(
          `Tried to get version from package manifest in order to validate changelog, but manifest is not well-formed (${error.message}).`,
        );
      } else if (error instanceof ChangelogFormattingError) {
        return fail([
          {
            message: 'Changelog is not well-formatted.',
          },
        ]);
      }
      throw new Error(
        `Encountered an error validating the changelog: ${getErrorMessage(
          error,
        )}.`,
      );
    }
  },
});
