import allYarnModernFilesConform from './all-yarn-modern-files-conform';
import classicYarnConfigFileAbsent from './classic-yarn-config-file-absent';
import packageEnginesNodeFieldConforms from './package-engines-node-field-conforms';
import packageExportsConform from './package-exports-conform';
import packageFilesConform from './package-files-conform';
import packageJestDependenciesConform from './package-jest-dependencies-conform';
import packageLavamoatTsupConforms from './package-lavamoat-tsup-conforms';
import packageLintDependenciesConform from './package-lint-dependencies-conform';
import packageMainConform from './package-main-conform';
import packageModuleConform from './package-module-conform';
import packagePackageManagerFieldConforms from './package-package-manager-field-conforms';
import packageTestScriptsConform from './package-test-scripts-conform';
import packageTypesConform from './package-types-conform';
import packageTypescriptDevDependenciesConform from './package-typescript-dev-dependencies-conform';
import packageTypescriptScriptsConform from './package-typescript-scripts-conform';
import readmeListsCorrectYarnVersion from './readme-lists-correct-yarn-version';
import readmeListsNodejsWebsite from './readme-recommends-node-install';
import requireJestConfig from './require-jest-config';
import requireNvmrc from './require-nvmrc';
import requireReadme from './require-readme';
import requireSourceDirectory from './require-source-directory';
import requireTsconfig from './require-tsconfig';
import requireTsconfigBuild from './require-tsconfig-build';
import requireTsupConfig from './require-tsup-config';
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
  packageExportsConform,
  packageMainConform,
  packageModuleConform,
  packageTypesConform,
  packageFilesConform,
  packageLavamoatTsupConforms,
] as const;
