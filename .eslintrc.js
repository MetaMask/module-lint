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
      files: ['src/cli.ts'],
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        // It's okay if this file has a shebang; it's meant to be executed
        // directly.
        'n/shebang': 'off',
      },
    },
  ],

  ignorePatterns: [
    '!.eslintrc.js',
    '!.prettierrc.js',
    'dist/',
    'docs/',
    '.yarn/',
  ],
};
