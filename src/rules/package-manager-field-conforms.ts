import { buildRule } from './helpers';
import { PackageManifestSchema, RuleName } from './types';

export default buildRule({
  name: RuleName.PackageManagerFieldConforms,
  description: 'Does the `packageManager` field in `package.json` conform?',
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

    if (projectManifest.packageManager !== templateManifest.packageManager) {
      return fail([
        {
          message: `\`packageManager\` is "${projectManifest.packageManager}", when it should be "${templateManifest.packageManager}".`,
        },
      ]);
    }
    return pass();
  },
});
