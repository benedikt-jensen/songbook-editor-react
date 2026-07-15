import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import { globalIgnores } from 'eslint/config'

export default [
  globalIgnores(['dist', 'src/pdf-server']),
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Stylistic-only, conflicts with the vendored Sakai layout's own formatting.
      'vue/html-indent': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/attribute-hyphenation': 'off',
      // Top-level route views (Dashboard.vue, etc.) are conventionally single-word.
      'vue/multi-word-component-names': 'off',
    },
  },
]
