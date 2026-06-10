// ESLint flat config (ESLint 9.x + typescript-eslint parser)
// DATA-01 gate: routes and components must not import *-data.ts static modules directly.
// All data access goes through data.server.ts (DB) or lib/cessation.ts / lib/metrics.ts
// (survivor re-exports for non-PHI presentation helpers).
//
// Scope: only the no-restricted-imports rule is enforced. TypeScript parser is
// configured to allow linting of .ts/.tsx files, but no TS-specific lint rules
// are enabled — this avoids flagging pre-existing issues in files outside this
// migration plan's scope (DATA-01 gate only, per PLAN.md task 3).

// @ts-check
import tsParser from "@typescript-eslint/parser";

export default [
  // Configure TypeScript parser for all TS/TSX files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // Apply no-restricted-imports gate to routes and components only.
  // Exempts app/lib/ files — cessation.ts and metrics.ts are intentional
  // re-export layers for survivor functions and static target definitions.
  {
    files: [
      "app/routes/**/*.{ts,tsx}",
      "app/components/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/real-data", "**/real-data.ts"],
              message:
                "Routes/components must not import real-data.ts directly. Use data.server.ts for DB reads, or ~/lib/metrics for static targets/projections.",
            },
            {
              group: ["**/protocol-data", "**/protocol-data.ts"],
              message:
                "Routes/components must not import protocol-data.ts directly. Use data.server.ts or ~/lib/cessation for survivor functions.",
            },
            {
              group: ["**/seed-data", "**/seed-data.ts"],
              message:
                "Routes/components must not import seed-data.ts directly. Use data.server.ts instead.",
            },
          ],
        },
      ],
    },
  },
];
