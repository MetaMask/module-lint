import { buildRule } from './build-rule';
import { RuleName } from './types';

export default buildRule({
  name: RuleName.PackageLavamoatTsupConform,
  description:
    'Does the `lavamoat.allowscripts` field in `package.json` conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async ({ project, template, pass, fail }) => {
    const entryPath = 'package.json';
    const templateManifest = await template.fs.readJsonFile(entryPath);
    const projectManifest = await project.fs.readJsonFile(entryPath);

    type Key = keyof typeof templateManifest;
    const templateLavamoat = templateManifest?.['lavamoat' as Key];
    const projectLavamoat = projectManifest?.['lavamoat' as Key];
    if (templateLavamoat && projectLavamoat) {
      type ChildKey = keyof typeof templateLavamoat;
      const templateAllowScripts = templateLavamoat['allowScripts' as ChildKey];
      const projectAllowScripts = projectLavamoat['allowScripts' as ChildKey];
      if (projectAllowScripts && !('tsup>esbuild' in projectAllowScripts)) {
        return fail([
          {
            message: `\`package.json\` should list \`"tsup>esbuild": "${JSON.stringify(
              templateAllowScripts?.['tsup>esbuild'],
            )}"\` in \`lavamoat.allowScripts\`, but does not.`,
          },
        ]);
      } else if (
        !(
          projectAllowScripts?.['tsup>esbuild'] ===
          templateAllowScripts?.['tsup>esbuild']
        )
      ) {
        return fail([
          {
            message: `\`tsup>esbuild\` is "${JSON.stringify(
              projectAllowScripts?.['tsup>esbuild'],
            )}", when it should be "${JSON.stringify(
              templateAllowScripts?.['tsup>esbuild'],
            )}".`,
          },
        ]);
      }
    }
    return pass();
  },
});
