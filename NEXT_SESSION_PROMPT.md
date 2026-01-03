# Initial Prompt for New Session

Copy and paste the following prompt when starting a new Claude Code session in `/Users/mac/Code/Tracker`:

---

## Prompt

I'm continuing development of the Wellness Tracker dashboard. Phase 0 (Foundation) is complete.

**Context:**
- Read `HANDOFF.md` for session summary
- Read `CLAUDE.md` for project guidance
- Read `.specify/memory/constitution.md` for principles
- Full plan at `/Users/mac/.claude/plans/immutable-conjuring-parnas.md`

**Reference projects to port from:**
- `/Users/mac/Code/Dash` - React components, hooks, storage utilities
- `/Users/mac/Code/Whoop` - Python data processing, JSON schema
- `/Users/mac/Code/comp` - Astro patterns, charting

**Next step:** Use `/speckit.specify` to create a specification for Phase 1: Core Data Layer

Phase 1 scope:
1. Port metric types and useMetrics hook from Dash
2. Create LocalStorage adapter with sync status tracking
3. Port calculation utilities (status, trend, significance)
4. Create WHOOP JSON parser and mapper

Please start by running `/speckit.specify` with the Phase 1 requirements.

---

## Alternative: Direct Implementation Prompt

If you want to skip spec-kit and implement directly:

---

I'm continuing development of the Wellness Tracker. Phase 0 is complete.

Read `HANDOFF.md` and `CLAUDE.md` for context.

Start Phase 1: Core Data Layer by porting these files from `/Users/mac/Code/Dash`:
1. `src/hooks/useMetrics.ts` → `src/hooks/useMetrics.ts`
2. `src/utils/storage/metrics.ts` → `src/lib/storage/local.ts`
3. `src/utils/metrics/calculations.ts` → `src/lib/calculations/metrics.ts`

Adapt them to work with our enhanced types in `src/types/metrics.ts`.

---
