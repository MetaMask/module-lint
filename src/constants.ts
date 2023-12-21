import path from 'path';

/**
 * The name of this project. Used to exclude this repo as a lintable project.
 */
const THIS_PROJECT_NAME = 'module-lint';

/**
 * The root directory of this project.
 */
const THIS_PROJECT_DIRECTORY_PATH = path.resolve(__dirname, '..');

/**
 * The number of milliseconds in an hour, used to determine when to pull the
 * latest changes for previously cached repositories.
 */
export const ONE_HOUR = 60 * 60 * 1000;

/**
 * The usage text printed when the user requests help or provides invalid input.
 */
export const USAGE_TEXT = `
Analyzes one or more repos for divergence from a template repo.

${THIS_PROJECT_NAME} [REPO_NAMES...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.
`.trim();

/**
 * In order to lint a remote repository, that repository must be cloned first.
 * This is the temporary directory where the clone lives.
 */
export const DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH = path.join(
  THIS_PROJECT_DIRECTORY_PATH,
  'tmp',
  'repositories',
);

/**
 * The name of the template repository that project repositories will be
 * compared to. The only such repository we have is the module template.
 */
export const DEFAULT_TEMPLATE_REPOSITORY_NAME = 'metamask-module-template';

/**
 * All of the remote MetaMask repositories that will be linted if a list is not
 * explicitly provided.
 */
export const DEFAULT_PROJECT_NAMES = [
  'auto-changelog',
  'create-release-branch',
  'module-lint',
  'utils',
];
