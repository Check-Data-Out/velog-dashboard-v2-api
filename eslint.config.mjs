import eslint from '@eslint/js';
import * as typescriptEslint from 'typescript-eslint';
import pluginPrettier from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';
import pluginJest from 'eslint-plugin-jest';

export default typescriptEslint.config(
  {
    files: ['**/*.ts'],
  },
  {
    // jest.config.ts 는 tsconfig.json 의 exclude 대상이라 타입 기반 린팅이 불가능하다.
    // lint 스크립트(src/**/*.ts)의 범위와도 일치시킨다.
    ignores: ['**/node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'jest.config.ts'],
  },
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...typescriptEslint.configs.strict,
  pluginJest.configs['flat/recommended'],
  configPrettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    plugins: {
      prettier: pluginPrettier,
      jest: pluginJest,
    },
  },
  {
    rules: {
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'allow-as-parameter',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
      ],
    },
  },
);
