module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:svelte/recommended',
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2021,
		extraFileExtensions: ['.svelte']
	},
	env: {
		browser: true,
		es2021: true,
		node: true
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		}
	],
  rules: {
    "no-console": "warn",
    "no-debugger": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
};
