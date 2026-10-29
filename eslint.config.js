import js from '@eslint/js';import tseslint from 'typescript-eslint';import globals from 'globals';
const config = [{ignores:['**/dist/**','**/node_modules/**']},js.configs.recommended,...tseslint.configs.recommended,{files:['client/src/**/*.{ts,tsx}'],languageOptions:{globals:globals.browser},rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_'}]}},{files:['server/**/*.js'],languageOptions:{globals:globals.node},rules:{'no-unused-vars':['warn',{argsIgnorePattern:'^_'}]}}];


config.push({files:['server/**/*.js'],rules:{'@typescript-eslint/no-unused-vars':'off'}});export default config;
