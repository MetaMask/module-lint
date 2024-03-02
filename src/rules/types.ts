import { type, string, record, array } from 'superstruct';

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
  PackageTestScriptsConform = 'package-test-scripts-conform',
  RequireTsConfig = 'require-tsconfig',
  RequireTsConfigBuild = 'require-tsconfig-build',
  RequireTsupConfig = 'require-tsup-config',
  PackageTypescriptDependenciesConform = 'package-typescript-dependencies-conform',
  PackageTypescriptScriptsConform = 'package-typescript-scripts-conform',
  PackageExportsFieldConforms = 'package-exports-field-conforms',
  PackageMainFieldConforms = 'package-main-field-conforms',
  PackageModuleFieldConforms = 'package-module-field-conforms',
  PackageTypesFieldConforms = 'package-types-field-conforms',
  PackageFilesFieldConforms = 'package-files-field-conforms',
  PackageLavamoatTsupConforms = 'package-lavamoat-tsup-conforms',
  PackageTypedocDependenciesConform = 'package-typedoc-dependencies-conform',
  RequireTypedoc = 'require-typedoc',
  PackageTypedocScriptsConform = 'package-typedoc-scripts-conform',
}

export const PackageManifestSchema = type({
  packageManager: string(),
  engines: type({
    node: string(),
  }),
  exports: type({
    '.': record(string(), string()),
    './package.json': string(),
  }),
  main: string(),
  module: string(),
  types: string(),
  files: array(string()),
  scripts: record(string(), string()),
  devDependencies: record(string(), string()),
});
