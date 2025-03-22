// Import Node.js path utilities for file path handling
// Import ESLint's compatibility layer for using traditional configs in flat config format
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Convert ESM URL to file path for proper directory resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize ESLint's compatibility layer for supporting traditional config format
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Register the check-file plugin through the compatibility layer
// This is required when using plugins with the FlatCompat approach
const checkFileConfig = compat.plugins("check-file");

const config = [
  // Ignore configuration - exclude shadcn UI components from linting
  {
    ignores: ["components/ui/**/*"],
  },

  // Extend popular configs through the compatibility layer
  // Order matters: later configs override earlier ones
  ...compat.extends(
    "next/core-web-vitals", // Next.js recommended rules
    "next/typescript", // TypeScript rules for Next.js
    "standard", // JavaScript Standard Style
    "plugin:drizzle/all", // Drizzle plugin rules
    "plugin:tailwindcss/recommended", // Tailwind CSS rules
    "prettier" // Prettier compatibility - must be last
  ),

  // Include the check-file plugin configuration registered earlier
  ...checkFileConfig,

  // Core rules configuration
  {
    rules: {
      // Enforce camelCase naming convention, but allow non-camelCase properties and imported names (e.g., Geist_Mono from next/font)
      camelcase: ["error", { properties: "never", ignoreImports: true }],

      // // Rule overrides that may conflict with standard config
      // "comma-dangle": "off", // Allow trailing commas (let Prettier handle)
      //
      // // Code style preferences (some override Standard style)
      // quotes: ["error", "double"], // Enforce double quotes instead of Standard's single quotes
      // semi: ["error", "always"], // Require semicolons (overrides Standard's no-semicolon rule)

      "prefer-arrow-callback": "error", // Use arrow functions for callbacks
      "no-process-env": "error", // Avoid direct process.env access for better testability
      "prefer-template": "error", // Use template literals instead of string concatenation

      // File naming convention rules
      "check-file/filename-naming-convention": [
        "error",
        {
          // Apply kebab-case to all TypeScript files
          "**/*.{ts,tsx}": "KEBAB_CASE",
        },
        {
          // Ignore middle extensions for test files (e.g., component.test.tsx)
          ignoreMiddleExtensions: true,
        },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          // Apply kebab-case to all folders except those in brackets and __tests__
          "src/**/!(__tests__|\\[*\\])": "KEBAB_CASE",
        },
      ],
    },
  },

  // TypeScript-specific overrides
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Disable no-undef for TypeScript files as TypeScript handles type checking
      "no-undef": "off",
    },
  },
];

export default config;
