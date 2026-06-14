# Phase 1: Client Onboarding (practitioner-operated) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 1-Client Onboarding (practitioner-operated)
**Areas discussed:** Invite→subject link flow, Active-subject selector, Client intake fields, Onboarding checklist

---

## Invite → subject link flow

### Subject-creation timing
| Option | Description | Selected |
|--------|-------------|----------|
| Create subject first, then invite | Subject created at intake; invite bound to subjectId; redemption links account; unblocks practitioner-first data entry | ✓ |
| Invite first, redemption creates subject | Subject row created only on redemption; blocks data entry until client logs in | |

**User's choice:** Create subject first, then invite.
**Notes:** Implies a nullable `subjectId` column on `invites`.

### Tenancy boundary
| Option | Description | Selected |
|--------|-------------|----------|
| One practice tenant, owner + client as subjects | One tenant = the practice; RLS isolates by subject_id; matches existing assignments/invites | ✓ (via note) |
| One tenant per client (walled islands) | Stronger isolation but breaks single-tenant GUC/invite/assignment assumptions; v1.2-ish | |

**User's choice:** One practice tenant (confirmed via note, no option clicked).
**Notes:** "practice will also have other practitioners, with permissions access to subset of clients, subset of features. This will come later in rounds plan fyi." → tenant = org; practitioners scoped to a subset of subjects via existing `practitioner_subject_assignments`; per-practitioner *feature*-level permissions deferred to v1.2+.

### Account-link requirement
| Option | Description | Selected |
|--------|-------------|----------|
| Optional / non-blocking | Subject + data usable without redemption; invite still wired for 03.1 UAT + ONB-02 | ✓ |
| Required to complete onboarding | Onboarding not "done" until client redeems; couples data work to client availability | |

**User's choice:** Optional / non-blocking.

---

## Active-subject selector

### Mechanism
| Option | Description | Selected |
|--------|-------------|----------|
| Server-set cookie | httpOnly cookie + getActiveSubject resolver, validated via assertSubjectAccess, owner fallback; one resolver swap | ✓ |
| URL-scoped (/s/:subjectId/…) | Explicit/bookmarkable but threads subjectId through every route; heavier (v1.2-ish) | |
| DB column on user | Cross-device persistence but adds migration + write-on-switch; overkill for 2 subjects | |

**User's choice:** Server-set cookie.

### Safety cue
| Option | Description | Selected |
|--------|-------------|----------|
| Persistent identity chip + switcher in app shell | Always-visible "Viewing: <name> ▾" on every screen | ✓ |
| Chip + distinct visual treatment for non-owner | Same chip + colored bar/accent when a client is active; strongest safety, more design | |
| Plain header dropdown only | Lightest, easiest to overlook | |

**User's choice:** Persistent identity chip + switcher.

### Default + stickiness
| Option | Description | Selected |
|--------|-------------|----------|
| Default to owner; session-scoped cookie | Each login lands on owner; remembers switch within session; resets on browser close | ✓ |
| Remember last subject; persistent cookie | Resumes on last-used subject across logins; convenient but can return "inside a client" | |

**User's choice:** Default to owner; session-scoped cookie.

---

## Client intake fields

### Which fields
| Option | Description | Selected |
|--------|-------------|----------|
| DOB + biological sex (clinical core) | Drives age/sex-specific reference ranges & likely engine rules | ✓ |
| Contact (email, optional phone) | Practitioner reference; invite delivery is out-of-band so email is informational | ✓ |
| Goals + intake notes (free text) | Practitioner narrative / health-history context | ✓ |
| Program start date | Anchors per-client protocol/program timeline | ✓ |

**User's choice:** All four.
**Notes:** User added: "cessation is a specific type of program. Some clients may be tapering substances, or making other major lifestyle modifications. same principle with phased gates etc. but needs to be flexible and adaptive to not only cessation of substance."

### Program generalization slice
| Option | Description | Selected |
|--------|-------------|----------|
| Capture program type + start date; defer engine | Model is program-type-aware; adaptive phased-gate engine deferred | ✓ |
| Generic start date only; add type + engine later | Thinner; leaves cessation assumptions baked longer | |
| Build generalized program model now | Large capability; scope creep for onboarding | |

**User's choice:** Capture program type + start date at intake; defer the engine.

---

## Onboarding checklist

### Items tracked
| Option | Description | Selected |
|--------|-------------|----------|
| Required data inputs: Genetics, Labs, WHOOP | ONB-04 core "report-ready" inputs | ✓ |
| Intake + consent | Intake fields complete + consent_log row | ✓ |
| Outputs: report + protocol | Report generated + protocol v1 authored (mirrors PROOF-01) | ✓ |
| Account status (invite sent/redeemed) | Informational, non-blocking | ✓ |

**User's choice:** All four (full loop).

### "Done" semantics
| Option | Description | Selected |
|--------|-------------|----------|
| Honest pipeline state (3-state) | Approved where review exists (genetics/labs), present for WHOOP; missing/in-progress/done | ✓ |
| Simple binary (any data present) | Green on any data, ignores review state; can overstate readiness | |

**User's choice:** Honest 3-state.

### Location
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated "Clients" page | Lists clients + status; hosts create + intake + invite; click → detail/switch | ✓ |
| Per-client panel on dashboard | Checklist on active subject's home; create-client still needs a home | |
| Extend /settings/assignments | Reuse owner-only admin page; buries onboarding in settings | |

**User's choice:** Dedicated `/clients` page.

---

## Claude's Discretion

- Exact schema column shapes (enum vs varchar for program type / biological sex; DOB as date), cookie name/flags, resolver file placement.
- Visual styling of the chip and `/clients` page beyond the PHI-safety requirement — defer to the Zoetrop design system / UI phase.

## Deferred Ideas

- Generalized adaptive phased-program engine (cessation = one program type) — likely near Phase 4 or a dedicated future phase.
- Per-practitioner feature-level permissions (granular RBAC) — v1.2+ "rounds plan".
- Invite email/SMS delivery (currently out-of-band, token shown once).
- v1.2 at-scale subject-switcher UX, multi-practitioner management, client self-service (already parked in `v1.2-OPERATIONS-PLAN.md`).
