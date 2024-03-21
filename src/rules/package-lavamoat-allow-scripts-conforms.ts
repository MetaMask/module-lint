import { get, has } from 'lodash';

import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';

export default buildRule({
  name: RuleName.PackageLavamoatAllowScriptsConforms,
  description:
    'Does lavamoat lists `@lavamoat/preinstall-always-fail: false` in allow scripts?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    const entryPath = 'package.json';
    const { project, pass, fail } = ruleExecutionArguments;
    const projectManifest = await project.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );
    return has(
      projectManifest.lavamoat.allowScripts,
      '@lavamoat/preinstall-always-fail',
    ) &&
      !get(
        projectManifest.lavamoat.allowScripts,
        '@lavamoat/preinstall-always-fail',
      )
      ? pass()
      : fail([
          {
            message:
              '`package.json` should list `"@lavamoat/preinstall-always-fail": false` in `lavamoat[allowScripts]`, but does not.',
          },
        ]);
  },
});
