import { buildRule } from './build-rule';
import { RuleName } from './types';
import { dataConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageLavamoatTsupConforms,
  description: 'Does LavaMoat allow scripts for `tsup>esbuild`?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async ({ project, template, pass }) => {
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
      if (projectAllowScripts) {
        return dataConform(
          templateAllowScripts,
          projectAllowScripts,
          'tsup>esbuild',
          entryPath,
        );
      }
    }

    return pass();
  },
});
