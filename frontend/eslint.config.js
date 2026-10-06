import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";
// P1-5: catch future unsafe innerHTML / dangerouslySetInnerHTML uses.
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default tseslint.config(
  { ignores: ["dist", "dist-node"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      // P1-5: no-unsanitized flags any new dangerouslySetInnerHTML that is NOT
      // going through a sanitizer. The two chart.tsx uses are safe (CSS tokens
      // only via cssIdent/cssColor) but are marked with eslint-disable comments
      // in the source so new additions are caught automatically.
      "no-unsanitized": noUnsanitized,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",

      // P1-5: warn on dangerouslySetInnerHTML without a documented sanitizer.
      // Existing chart.tsx usages are CSS-only (cssIdent+cssColor) and carry
      // suppressions; new ones must do the same or fix.
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",

      // Legacy codebase me unused vars hain — signal rakho (warn), gate nahi.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-empty": "warn",
      // Destructuring me sirf tab error, jab SABHI variables never-reassigned
      // hon (partial `let [_, h, m] = ...; h = ...` valid hai).
      "prefer-const": ["error", { destructuring: "all" }],
      "@typescript-eslint/no-require-imports": "warn",
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
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  },
  {
    // Plain JS: TS compiler is not in the loop, so no-undef stays a hard error.
    files: ["**/*.{cjs,mjs}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TS ki apni type-checking ye detect karti hai (lint me double signal nahi).
      "no-undef": "off",
      "no-unused-vars": "off",
      // Recommended ke strict rules legacy code par mass-error hain → warn.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/triple-slash-reference": "warn",
      "@typescript-eslint/no-namespace": "warn",
    },
  },
  {
    // Frontend JS files: browser globals + base rules TS ke baad wapas enable.
    files: ["**/*.{js,jsx}"],
    rules: {
      "no-undef": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
