import { type, string, record } from 'superstruct';

/**
 * All of the known rules.
 */
export enum RuleName {
  AllYarnModernFilesConform = 'all-yarn-modern-files-conform',
  ClassicYarnConfigFileAbsent = 'classic-yarn-config-file-absent',
  PackageManagerFieldConforms = 'package-manager-field-conforms',
  ReadmeListsCorrectYarnVersion = 'readme-lists-correct-yarn-version',
  RequireReadme = 'require-readme',
  RequireSourceDirectory = 'require-source-directory',
  RequireValidPackageManifest = 'require-valid-package-manifest',
  RequireNvmrc = 'require-nvmrc',
  PackageEnginesNodeFieldConforms = 'package-engines-node-field-conforms',
  ReadmeRecommendsNodeInstall = 'readme-recommends-node-install',
  PackageLintDependenciesConform = 'package-lint-dependencies-conform',
}

export const PackageManifestSchema = type({
  packageManager: string(),
  engines: type({
    node: string(),
  }),
  devDependencies: record(string(), string()),
});
