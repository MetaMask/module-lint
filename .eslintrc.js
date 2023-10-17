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
      files: ['src/cli.ts'],
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        'n/shebang': 'off',
      },
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
  ],

  ignorePatterns: [
    '!.eslintrc.js',
    '!.prettierrc.js',
    'dist/',
    'docs/',
    '.yarn/',
    'tmp/',
  ],
};
