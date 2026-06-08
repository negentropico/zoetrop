/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The React Router Vite plugin must be excluded during vitest runs —
// it intercepts module transforms and crashes jsdom component tests with
// "React Router Vite plugin can't detect preamble".
// Standard workaround: check VITEST env var and omit the plugin in test mode.
const isTest = process.env["VITEST"];

export default defineConfig({
  plugins: [tailwindcss(), ...(isTest ? [] : [reactRouter()]), tsconfigPaths()],
  test: {
    // Default environment: "node" — keeps engine tests (Phase 1) running in Node.
    // Component tests (Wave 2 onward) opt into jsdom per-file via the file-level
    // pragma:  // @vitest-environment jsdom
    // Vitest checks the pragma before spawning the environment, so adding the
    // pragma to a single test file is sufficient — no global default change needed.
    environment: "node",
    setupFiles: ["./app/test-setup.ts"],
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    // Vitest 4.x exits 1 when no test files match (CI guard). The harness is
    // installed before any engine tests exist (Plans 01-04/01-05 add them), so
    // an empty run must still exit 0 to prove the harness boots. The include
    // glob above is exercised by those downstream test suites.
    passWithNoTests: true,
  },
});
