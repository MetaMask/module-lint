import allYarnModernFilesConform from './all-yarn-modern-files-conform';
import classicYarnConfigFileAbsent from './classic-yarn-config-file-absent';
import packageAllowScriptsYarnConform from './package-allow-scripts-yarn-conform';
import packageAllowScriptsYarnPluginsConform from './package-allow-scripts-yarn-plugins-conform';
import packageChangelogDevDependenciesConform from './package-changelog-dev-dependencies-conform';
import packageChangelogScriptsConform from './package-changelog-scripts-conform';
import packageEnginesNodeFieldConforms from './package-engines-node-field-conforms';
import packageExportsFieldConforms from './package-exports-field-conforms';
import packageFilesFieldConforms from './package-files-field-conforms';
import packageJestDependenciesConform from './package-jest-dependencies-conform';
import packageLavamoatAllowScriptsConforms from './package-lavamoat-allow-scripts-conforms';
import packageLavamoatDevDependenciesConform from './package-lavamoat-dev-dependencies-conform';
import packageLavamoatTsupConforms from './package-lavamoat-tsup-conforms';
import packageLintDependenciesConform from './package-lint-dependencies-conform';
import packageMainFieldConforms from './package-main-field-conforms';
import packageModuleFieldConforms from './package-module-field-conforms';
import packagePackageManagerFieldConforms from './package-package-manager-field-conforms';
import packageTestScriptsConform from './package-test-scripts-conform';
import packageTypedocDevDependenciesConform from './package-typedoc-dev-dependencies-conform';
import packageTypedocScriptsConform from './package-typedoc-scripts-conform';
import packageTypesFieldConforms from './package-types-field-conforms';
import packageTypescriptDevDependenciesConform from './package-typescript-dev-dependencies-conform';
import packageTypescriptScriptsConform from './package-typescript-scripts-conform';
import readmeListsCorrectYarnVersion from './readme-lists-correct-yarn-version';
import readmeListsNodejsWebsite from './readme-recommends-node-install';
import requireChangelog from './require-changelog';
import requireEditorconfig from './require-editorconfig';
import requireGitattributes from './require-gitattributes';
import requireGitignore from './require-gitignore';
import requireJestConfig from './require-jest-config';
import requireNvmrc from './require-nvmrc';
import requireReadme from './require-readme';
import requireSourceDirectory from './require-source-directory';
import requireTsconfig from './require-tsconfig';
import requireTsconfigBuild from './require-tsconfig-build';
import requireTsupConfig from './require-tsup-config';
import requireTypedoc from './require-typedoc';
import requireValidChangelog from './require-valid-changelog';
import requireValidPackageManifest from './require-valid-package-manifest';

export const rules = [
  allYarnModernFilesConform,
  classicYarnConfigFileAbsent,
  packagePackageManagerFieldConforms,
  readmeListsCorrectYarnVersion,
  requireReadme,
  requireSourceDirectory,
  requireValidPackageManifest,
  requireNvmrc,
  packageEnginesNodeFieldConforms,
  readmeListsNodejsWebsite,
  packageLintDependenciesConform,
  packageJestDependenciesConform,
  requireJestConfig,
  packageTestScriptsConform,
  requireTsconfig,
  requireTsconfigBuild,
  requireTsupConfig,
  packageTypescriptDevDependenciesConform,
  packageTypescriptScriptsConform,
  packageExportsFieldConforms,
  packageMainFieldConforms,
  packageModuleFieldConforms,
  packageTypesFieldConforms,
  packageFilesFieldConforms,
  packageLavamoatTsupConforms,
  packageTypedocDevDependenciesConform,
  packageTypedocScriptsConform,
  requireTypedoc,
  requireChangelog,
  requireValidChangelog,
  packageChangelogDevDependenciesConform,
  packageChangelogScriptsConform,
  requireEditorconfig,
  requireGitattributes,
  requireGitignore,
  packageLavamoatDevDependenciesConform,
  packageLavamoatAllowScriptsConforms,
  packageAllowScriptsYarnConform,
  packageAllowScriptsYarnPluginsConform,
] as const;
