import requirePackageJson from './require-package-json';
import requireSourceDirectory from './require-source-directory';

export const rules = [requireSourceDirectory, requirePackageJson] as const;
