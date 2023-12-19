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

${THIS_PROJECT_NAME} OPTIONS [ARGUMENTS...]

Pass the names of one or more MetaMask repositories to lint them, or pass
nothing to lint all MetaMask repositories.
`.trim();

/**
 * In order to lint a remote repository, that repository must be cloned first.
 * This is the temporary directory where the clone lives.
 */
export const DEFAULT_CACHED_REPOSITORIES_DIRECTORY_PATH = path.join(
  THIS_PROJECT_DIRECTORY_PATH,
  'tmp/repositories',
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
  'abi-utils',
  'action-create-release-pr',
  'action-is-release',
  'action-npm-publish',
  'action-publish-gh-pages',
  'action-publish-release',
  'action-require-additional-reviewer',
  'action-tech-challenge-setup',
  'action-utils',
  'actions-gh-pages-test-repo',
  'actions-test-repo',
  'auto-changelog',
  'bip39',
  'cla-signature-bot',
  'contract-metadata',
  'contributor-docs',
  'core',
  'create-release-branch',
  'eslint-config',
  'eth-block-tracker',
  'eth-json-rpc-filters',
  'eth-json-rpc-infura',
  'eth-json-rpc-middleware',
  'eth-json-rpc-provider',
  'eth-method-registry',
  'eth-phishing-detect',
  'eth-sig-util',
  'eth-token-tracker',
  'etherscan-link',
  'ethjs',
  'ethjs-abi',
  'ethjs-contract',
  'ethjs-filter',
  'ethjs-format',
  'ethjs-provider-http',
  'ethjs-query',
  'ethjs-rpc',
  'ethjs-schema',
  'ethjs-unit',
  'ethjs-util',
  'extension-port-stream',
  'forwarder',
  'jazzicon',
  'json-rpc-engine',
  'json-rpc-middleware-stream',
  'logo',
  'metamask-eth-abis',
  'metamask-module-template',
  'metamask-monorepo-template',
  'monorepo-actions-test',
  'nonce-tracker',
  'number-to-bn',
  'object-multiplex',
  'obs-store',
  'oss-attribution-generator',
  'phishing-warning',
  'post-message-stream',
  'providers',
  'rpc-errors',
  'safe-event-emitter',
  'scure-bip39',
  'state-log-explorer',
  'swappable-obj-proxy',
  'tech-challenge-setup',
  'technical-challenge-shared-libraries',
  'test-dapp',
  'types',
  'utils',
  'vault-decryptor',
  'web3-provider-engine',
  'web3-stream-provider',
];
