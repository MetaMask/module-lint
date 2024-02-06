import { type, string, record } from 'superstruct';

/**
 * All of the known rules.
 */
export enum RuleName {
  AllYarnModernFilesConform = 'all-yarn-modern-files-conform',
  ClassicYarnConfigFileAbsent = 'classic-yarn-config-file-absent',
  PackagePackageManagerFieldConforms = 'package-package-manager-field-conforms',
  ReadmeListsCorrectYarnVersion = 'readme-lists-correct-yarn-version',
  RequireReadme = 'require-readme',
  RequireSourceDirectory = 'require-source-directory',
  RequireValidPackageManifest = 'require-valid-package-manifest',
  RequireNvmrc = 'require-nvmrc',
  PackageEnginesNodeFieldConforms = 'package-engines-node-field-conforms',
  ReadmeRecommendsNodeInstall = 'readme-recommends-node-install',
  PackageLintDependenciesConform = 'package-lint-dependencies-conform',
  PackageJestDependenciesConform = 'package-jest-dependencies-conform',
  RequireJestConfig = 'require-jest-config',
  PackageJestScriptsConform = 'package-jest-scripts-conform',
}

export const PackageManifestSchema = type({
  packageManager: string(),
  engines: type({
    node: string(),
  }),
  scripts: record(string(), string()),
  devDependencies: record(string(), string()),
});
