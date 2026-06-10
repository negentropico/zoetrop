/**
 * cessation.ts — Survivor engine functions for cessation protocol math.
 *
 * These are non-PHI, non-static-data helpers extracted from protocol-data.ts
 * for use in route loaders after the static-to-DB migration (Phase 4).
 *
 * Routes import from this module instead of protocol-data.ts so the ESLint
 * no-restricted-imports gate can block protocol-data.ts (which contains PHI
 * real* arrays) without false-positives on the survivor engine functions.
 *
 * Plan 05 will physically delete the real* PHI arrays from protocol-data.ts
 * and these re-exports can be updated to the remaining direct exports.
 */

export {
  getCessationDay,
  getCurrentCessationPhase,
  CESSATION_START_DATE,
  dailySchedule,
  avoidList,
} from "./protocol-data";

// CESSATION_PHASES is a pure constant in types/protocol — no PHI, safe for routes.
export { CESSATION_PHASES } from "~/types/protocol";
