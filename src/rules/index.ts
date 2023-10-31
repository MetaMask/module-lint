import complyYarn from './comply-yarn';
import requirePackageJson from './require-package-json';
import requireReadme from './require-readme';
import requireSourceDirectory from './require-source-directory';

export const rules = [
  requireSourceDirectory,
  requirePackageJson,
  requireReadme,
  complyYarn,
] as const;
