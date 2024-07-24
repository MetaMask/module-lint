module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts'],
      extends: [
        '@metamask/eslint-config-typescript',
        '@metamask/eslint-config-nodejs',
      ],
    },

    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: [
        '@metamask/eslint-config-jest',
        '@metamask/eslint-config-nodejs',
      ],
    },

    {
      files: ['src/cli.ts', '.github/scripts/**/*.ts'],
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        // These are scripts and are meant to have shebangs.
        'n/shebang': 'off',
      },
    },

    {
      files: ['.github/scripts/**/*.ts'],
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        'n/no-process-env': 'off',
      },
    },
  ],

  ignorePatterns: [
    '!.eslintrc.js',
    '!.github/',
    '!.prettierrc.js',
    '.yarn/',
    'dist/',
    'docs/',
    'tmp/',
  ],
};
