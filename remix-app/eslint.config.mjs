// ESLint flat config (ESLint 9.x + typescript-eslint parser)
// DATA-01 gate: routes and components must not import *-data.ts static modules directly.
// All data access goes through data.server.ts (DB) or lib/cessation.ts / lib/metrics.ts
// (survivor re-exports for non-PHI presentation helpers).
//
// ENG-01 gate: engine.ts must remain import-pure (no Drizzle/Remix/DB imports).
// The rule file target below flags any such import added to engine.ts.
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

  // ENG-01 import-correctness gate: engine.ts must stay import-pure (D-01 / ROADMAP SC2).
  // Flags any drizzle-orm, react-router, @react-router/*, or @neondatabase/* import
  // that gets added to engine.ts. The .server.ts suffix is bundle-hygiene only —
  // the module must remain callable from a bare Node/vitest context.
  {
    files: ["app/lib/engine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["drizzle-orm", "drizzle-orm/*"],
              message:
                "engine.ts must not import drizzle-orm. This module must stay import-pure (D-01 / ROADMAP SC2). Move DB logic to corpus.server.ts or data.server.ts.",
            },
            {
              group: ["react-router", "react-router/*"],
              message:
                "engine.ts must not import react-router. This module must stay import-pure (D-01 / ROADMAP SC2).",
            },
            {
              group: ["@react-router/*"],
              message:
                "engine.ts must not import @react-router/*. This module must stay import-pure (D-01 / ROADMAP SC2).",
            },
            {
              group: ["@neondatabase/*"],
              message:
                "engine.ts must not import @neondatabase/*. This module must stay import-pure (D-01 / ROADMAP SC2). DB connections belong in db.server.ts.",
            },
          ],
        },
      ],
    },
  },
];
