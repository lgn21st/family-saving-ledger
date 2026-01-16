import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**']
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  ...vueTs({
    extends: ['recommended']
  }),
  prettier,
  {
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
]
