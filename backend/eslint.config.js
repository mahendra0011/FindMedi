import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-node", "node_modules", "prisma", "*.log"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Test files: jest globals
    files: ["**/test/**/*.js", "**/*.test.js", "**/*.mongosh.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest, db: "readonly", print: "readonly", printjson: "readonly" },
    },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Scripts & seed files: node globals + __dirname/__filename/performance
    files: ["scripts/**/*.js", "scripts/**/*.mjs", "*.mjs", "seed-*.mjs"],
    languageOptions: {
      globals: { ...globals.node, __dirname: "readonly", __filename: "readonly", performance: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Rust helper tests: allow require
    files: ["rust-helper/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.es2022, Record: "readonly" },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]" }],
      "no-empty": "warn",
      "no-constant-condition": ["warn", { checkLoops: false }],
      "no-useless-escape": "warn",
      "no-misleading-character-class": "warn",
      "no-control-regex": "warn",
      "no-prototype-builtins": "warn",
      "no-case-declarations": "warn",
      "no-inner-declarations": "warn",
      "no-async-promise-executor": "warn",
      "no-cond-assign": "warn",
      "no-extra-semi": "warn",
      "no-redeclare": "warn",
      "no-unexpected-multiline": "warn",
      "prefer-const": ["error", { destructuring: "all" }],
      // False positive in errorHandler.js (no actual this aliasing)
      "@typescript-eslint/no-this-alias": "off",
    },
  },
);