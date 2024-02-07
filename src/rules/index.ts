import allYarnModernFilesConform from './all-yarn-modern-files-conform';
import classicYarnConfigFileAbsent from './classic-yarn-config-file-absent';
import packageEnginesNodeFieldConforms from './package-engines-node-field-conforms';
import packageJestDependenciesConform from './package-jest-dependencies-conform';
import packageLintDependenciesConform from './package-lint-dependencies-conform';
import packagePackageManagerFieldConforms from './package-package-manager-field-conforms';
import packageTestScriptsConform from './package-test-scripts-conform';
import readmeListsCorrectYarnVersion from './readme-lists-correct-yarn-version';
import readmeListsNodejsWebsite from './readme-recommends-node-install';
import requireJestConfig from './require-jest-config';
import requireNvmrc from './require-nvmrc';
import requireReadme from './require-readme';
import requireSourceDirectory from './require-source-directory';
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
] as const;
