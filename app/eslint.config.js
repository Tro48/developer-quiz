// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Тело компонента — не больше 100 строк: пустые строки и комментарии не считаются.
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      // Колпак на файл, чтобы компонент не разрастался за счёт стилей и хелперов.
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
]);
