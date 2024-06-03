import { isErrorWithCode, isErrorWithMessage } from '@metamask/utils/node';

import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import { RuleExecutionStatus } from '../execute-rules';
import { fileExists } from '../rule-helpers';

export default buildRule({
  name: RuleName.RequireValidPackageManifest,
  description: 'Does the package have a well-formed manifest (`package.json`)?',
  dependencies: [],
  execute: async (ruleExecutionArguments) => {
    const { project, pass, fail } = ruleExecutionArguments;
    const entryPath = 'package.json';

    const fileExistsResult = await fileExists(
      entryPath,
      ruleExecutionArguments,
    );
    if (fileExistsResult.status !== RuleExecutionStatus.Passed) {
      return fileExistsResult;
    }

    try {
      await project.fs.readJsonFileAs(entryPath, PackageManifestSchema);
      return pass();
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        isErrorWithMessage(error) &&
        error.code === 'ERR_INVALID_JSON_FILE'
      ) {
        return fail([
          { message: `Invalid \`${entryPath}\`: ${error.message}` },
        ]);
      }
      throw error;
    }
  },
});
