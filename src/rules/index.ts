import allYarnModernFilesConform from './all-yarn-modern-files-conform';
import classicYarnConfigFileAbsent from './classic-yarn-config-file-absent';
import packageEnginesNodeFieldConforms from './package-engines-node-field-conforms';
import packageLintDependenciesConform from './package-lint-dependencies-conform';
import packageManagerFieldConforms from './package-manager-field-conforms';
import readmeListsCorrectYarnVersion from './readme-lists-correct-yarn-version';
import readmeListsNodejsWebsite from './readme-recommends-node-install';
import requireNvmrc from './require-nvmrc';
import requireReadme from './require-readme';
import requireSourceDirectory from './require-source-directory';
import requireValidPackageManifest from './require-valid-package-manifest';

export const rules = [
  allYarnModernFilesConform,
  classicYarnConfigFileAbsent,
  packageManagerFieldConforms,
  readmeListsCorrectYarnVersion,
  requireReadme,
  requireSourceDirectory,
  requireValidPackageManifest,
  requireNvmrc,
  packageEnginesNodeFieldConforms,
  readmeListsNodejsWebsite,
  packageLintDependenciesConform,
] as const;
