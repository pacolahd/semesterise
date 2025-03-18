// Prettier configuration file (.prettierrc.js)
module.exports = {
  // Spacing & Indentation
  tabWidth: 2, // Use 2 spaces for indentation
  useTabs: false, // Use spaces instead of tab characters

  // Code Style
  semi: true, // Add semicolons at the end of statements
  singleQuote: false, // Use double quotes for string literals
  jsxSingleQuote: false, // Use double quotes for JSX attributes
  trailingComma: "es5", // Add trailing commas where valid in ES5 (objects, arrays, etc.)
  arrowParens: "always", // Always include parentheses around arrow function parameters

  // Import Sorting (requires @trivago/prettier-plugin-sort-imports)
  importOrder: [
    // Framework-related imports first (React and Next.js)
    // This regex captures:
    // - "react" or "react/something"
    // - "next" or "next/something"
    "^(react|next?/?([a-zA-Z/]*))$",

    // Then third-party modules (from node_modules)
    "<THIRD_PARTY_MODULES>",

    // Then internal modules with the @/ prefix (aliased paths)
    "^@/(.*)$",

    // Finally, relative imports starting with ./ or ../
    "^[./]",
  ],
  importOrderSeparation: true, // Add blank line between import groups
  importOrderSortSpecifiers: true, // Sort named imports (e.g., import { A, B, C } from 'module')

  // Plugins
  plugins: [
    "@trivago/prettier-plugin-sort-imports", // For import sorting
  ],
};
