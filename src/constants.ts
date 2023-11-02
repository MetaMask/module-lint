import path from 'path';

/**
 * The name of this project. Used to exclude this repo as a lintable project.
 */
export const THIS_PROJECT_NAME = 'module-lint';

/**
 * The root directory of this project.
 */
export const THIS_PROJECT_DIRECTORY_PATH = path.resolve(__dirname, '..');

/**
 * Wherever the tool was run.
 */
export const WORKING_DIRECTORY_PATH = process.cwd();

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
 * All of the remote MetaMask repositories that will be linted if you don't
 * explicitly provide one.
 *
 * Derived from: <https://github.com/MetaMask/core/issues/1079>
 */
export const DEFAULT_PROJECT_NAMES = [
  'KeyringController',
  'abi-utils',
  'action-create-release-pr',
  'action-is-release',
  'action-npm-publish',
  'action-publish-gh-pages',
  'action-publish-release',
  'action-tech-challenge-setup',
  'action-utils',
  'actions-test-repo',
  'api-playground',
  'api-specs',
  'auto-changelog',
  'bify-module-groups',
  'browser-passworder',
  'contract-metadata',
  'create-release-branch',
  'design-tokens',
  'detect-provider',
  'docusaurus-openrpc',
  'eth-block-tracker',
  'eth-hd-keyring',
  'eth-json-rpc-filters',
  'eth-json-rpc-infura',
  'eth-json-rpc-middleware',
  'eth-json-rpc-provider',
  'eth-ledger-bridge-keyring',
  'eth-method-registry',
  'eth-phishing-detect',
  'eth-sig-util',
  'eth-simple-keyring',
  'eth-snap-keyring',
  'eth-token-tracker',
  'eth-trezor-keyring',
  'ethereum-provider-openrpc-generator',
  'etherscan-link',
  'extension-port-stream',
  'extension-provider',
  'iframe-ee-openrpc-inspector-transport',
  'json-rpc-engine',
  'json-rpc-middleware-stream',
  'key-tree',
  'keyring-api',
  'keyring-snaps-registry',
  'logo',
  'metamask-eth-abis',
  'metamask-onboarding',
  'mobile-provider',
  'noble-secp256k1-compat-wrapper',
  'nonce-tracker',
  'object-multiplex',
  'obs-store',
  'open-rpc-docs-react',
  'openrpc-inspector-transport',
  'phishing-warning',
  'post-message-stream',
  'ppom-validator',
  'providers',
  'rpc-errors',
  'safe-event-emitter',
  'smart-transactions-controller',
  'snap-simple-keyring',
  'snaps-registry',
  'state-log-explorer',
  'swappable-obj-proxy',
  'template-sync',
  'test-dapp',
  'types',
  'utils',
  'vault-decryptor',
  'web3-stream-provider',
];

/**
 * The path to the file that stores all of the repositories within the GitHub
 * MetaMask organization. You can't lint a remote repository that isn't one of
 * these (because we can't guarantee it can be cloned). This is committed to the
 * project.
 */
export const VALID_REPOSITORIES_CACHE_PATH = path.resolve(
  __dirname,
  'valid-repositories.json',
);

/**
 * The number of milliseconds in an hour, used as a cache age.
 */
export const ONE_HOUR = 60 * 60 * 1000;
