import { buildRule } from './build-rule';
import { PackageManifestSchema, RuleName } from './types';
import { RepositoryFilesystem } from '../repository-filesystem';
import { dataConform } from '../rule-helpers';

export default buildRule({
  name: RuleName.PackageChangelogModuleLintDependenciesConform,
  description:
    'Do the changelog-related `devDependencies` in `package.json` of module-lint conform?',
  dependencies: [RuleName.RequireValidPackageManifest],
  execute: async (ruleExecutionArguments) => {
    // module-lint / current repository file system
    const workingDirectoryPath = process.cwd();
    const repositoryFilesystem = new RepositoryFilesystem(workingDirectoryPath);
    const { template } = ruleExecutionArguments;
    const entryPath = 'package.json';
    const templateManifest = await template.fs.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );
    const moduleLintPackageManifest = await repositoryFilesystem.readJsonFileAs(
      entryPath,
      PackageManifestSchema,
    );
    return dataConform(
      templateManifest,
      moduleLintPackageManifest,
      'devDependencies.[@metamask/auto-changelog]',
      entryPath,
    );
  },
});
