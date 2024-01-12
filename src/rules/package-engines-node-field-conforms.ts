import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';

export default buildRule({
  name: RuleName.PackageEnginesNodeFieldConforms,
  description: 'Does the `engines.node` field in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async ({ project, template, pass, fail }) => {
    const entryPath = 'package.json';
    const templateManifest = await template.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );
    const projectManifest = await project.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );

    if (projectManifest.engines.node !== templateManifest.engines.node) {
      return fail([
        {
          message: `\`engines.node\` is ${projectManifest.engines.node}, when it should be ${templateManifest.engines.node}.`,
        },
      ]);
    }
    return pass();
  },
});
