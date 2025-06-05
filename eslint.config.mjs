import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default eslint.config(
  {
    ignores: [
      'node_modules/**/*',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      semi: ['error', 'never'],
    },
  },
)
