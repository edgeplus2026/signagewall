// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // `_`-prefixed bindings are deliberately unused — the codebase uses them
      // to name what it is discarding (`const { lastSeenAt: _lastSeenAt, ...rest }`
      // reads better than an opaque omit). Matches the CMS config.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    // Test files only. Each rule below is switched off because Jest's own API
    // makes it fire on correct code — not to paper over sloppy tests. Silencing
    // them here beats the alternative, which is scattering `as unknown as X`
    // through the suite and losing real type safety to satisfy a linter.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      // `expect(mock.method)` reads a method off its object. Documented false
      // positive on Jest matchers; there is no unbound `this` in a mock.
      '@typescript-eslint/unbound-method': 'off',
      // Asymmetric matchers (`expect.any`, `expect.objectContaining`) are typed
      // `any` by @types/jest, so every use inside an expected object literal
      // trips these two. Same for supertest's untyped `res.body`.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // A mock standing in for a Promise-returning interface method has to be
      // `async` to match the signature, even with nothing to await.
      '@typescript-eslint/require-await': 'off',
    },
  },
);
