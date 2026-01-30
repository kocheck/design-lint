const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const figmaPlugin = require("@figma/eslint-plugin-figma-plugins");
const globals = require("globals");

module.exports = tseslint.config(
  // Global ignores
  {
    ignores: ["dist/", "node_modules/", "webpack.config.js", "eslint.config.js", "**/*.js", "!src/**/*.js"]
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Figma plugins recommended (flat config)
  figmaPlugin.flatConfigs.recommended,

  // React recommended
  reactPlugin.configs.flat.recommended,

  // Main configuration for all TS/TSX files
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node
      }
    },
    plugins: {
      "react-hooks": reactHooksPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // Strict async/await rules - critical for Figma plugin performance
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: {
          attributes: false // Allow async functions as React event handlers
        }
      }],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/promise-function-async": "warn",

      // Type safety
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Allow certain patterns common in existing codebase
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/restrict-plus-operands": "warn",

      // General quality rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",

      // React rules
      "react/prop-types": "off", // Using TypeScript for prop validation
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Figma plugin specific
      // Deprecated sync methods and prop setters - warn for now, sync APIs still work but should be migrated
      "@figma/figma-plugins/ban-deprecated-sync-methods": "warn",
      "@figma/figma-plugins/ban-deprecated-sync-prop-setters": "warn",

      // Allow unused variables starting with _ and in certain patterns (legacy code)
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],

      // Redundant type constituents (from union types)
      "@typescript-eslint/no-redundant-type-constituents": "warn",

      // React unescaped entities - warn for legacy code
      "react/no-unescaped-entities": "warn",

      // Allow inner function declarations in legacy code (warn instead of error)
      "no-inner-declarations": "warn",

      // Allow dynamic requires for asset loading (webpack resolves these)
      "@typescript-eslint/no-require-imports": "off",

      // Figma deprecated prop getters - warn for now during migration
      "@figma/figma-plugins/ban-deprecated-sync-prop-getters": "warn",

      // Allow unused expressions in certain patterns
      "@typescript-eslint/no-unused-expressions": "warn",

      // Base to string - warn for now
      "@typescript-eslint/no-base-to-string": "warn",

      // Await thenable - warn for now
      "@typescript-eslint/await-thenable": "warn"
    }
  },

  // Plugin code overrides
  {
    files: ["src/plugin/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "no-console": "off" // Allow console in plugin for debugging
    }
  },

  // UI code overrides
  {
    files: ["src/app/**/*.tsx", "src/app/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "warn"
    }
  }
);
