import { type, string } from 'superstruct';

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
}

export const PackageManifestSchema = type({
  packageManager: string(),
});
