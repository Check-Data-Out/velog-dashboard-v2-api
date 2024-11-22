import eslint from '@eslint/js';
import * as typescriptEslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// 기존 ESLint 설정을 새로운 flat config 형식으로 변환하기 위한 도구 초기화 (.eslintrc => eslint.config.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default typescriptEslint.config(
  {
    files: ['**/*.{ts,tsx}'],
  },
  // 린트에서 무시할 파일/디렉토리 설정
  {
    ignores: ['**/node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },
  // 기본 설정 확장
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...typescriptEslint.configs.stylistic,
  ...compat.extends('eslint-config-airbnb-base'),
  {
    // 파서 설정
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    // Prettier 플러그인 설정
    plugins: {
      prettier: eslintPluginPrettier, // ESLint와 Prettier 규칙 충돌 방지
    },
  },
  {
    rules: {
      'no-console': 'off',
      'import/extensions': 'off', // 파일 확장자 규칙 비활성화
      'import/no-unresolved': 'off', // 모듈 경로 해석 규칙 비활성화
      'import/extensions': [
        'off',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      // TypeScript 관련 규칙
      '@typescript-eslint/no-explicit-any': 'error', // any타입 사용 금지
      '@typescript-eslint/no-unused-vars': [
        // 미사용 변수 에러 = 언더스코어(명시적으로 사용) 예외
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/promise-function-async': 'error', // Promise 반환 함수에 async 강제
      '@typescript-eslint/explicit-function-return-type': 'off', // 함수 반환 타입 명시
      '@typescript-eslint/consistent-type-assertions': [
        // 타입 단언보다 타입 선언 사용 권장
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'allow-as-parameter',
        },
      ],
      // 네이밍 컨벤션
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase'],
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
