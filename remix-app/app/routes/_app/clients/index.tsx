/**
 * clients/index.tsx — Client management surface (ONB-02/ONB-04 UI, D-11)
 *
 * Lists all client subjects with an honest 3-state onboarding checklist strip
 * (ONB-04 UI), generates subject-bound invites with token-shown-once reveal
 * (ONB-02 UI), and provides a View action to switch the active subject.
 *
 * Security contracts:
 *   - requireRole(user, ["owner","practitioner"]): clients 403 (T-01-client-views-clients)
 *   - generate-invite: subjectId re-resolved against practitioner's own subjects before
 *     generateInvite — IDOR mitigation (T-01-invite-IDOR)
 *   - revoke-invite: tenantId from session, never form (T-01-revoke-IDOR)
 *   - Token returned once in action data, gone on navigation (T-01-token-exposure)
 *   - Checklist strip reflects honest 3-state from getChecklistStatus (T-01-false-done)
 */

import { useState } from "react";
import { Form, useLoaderData, useActionData } from "react-router";
import type { Route } from "./+types/index";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Avatar } from "~/components/ui/Avatar";
import { PageHeader } from "~/components/ui/PageHeader";
import { Copy, Check, Plus } from "lucide-react";
import { requireUser, requireRole } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { listClientSubjects, getSubjectById } from "~/lib/subjects.server";
import { getChecklistStatus } from "~/lib/checklist.server";
import type { ChecklistStatus } from "~/lib/checklist.server";
import { generateInvite, listInvites, revokeInvite } from "~/lib/invites.server";

// ── Types ──────────────────────────────────────────────────────────────────────

type SubjectRow = Awaited<ReturnType<typeof listClientSubjects>>[number];
type InviteRow = Awaited<ReturnType<typeof listInvites>>[number];

interface ClientEntry {
  subject: SubjectRow;
  checklist: ChecklistStatus;
}

// ── Meta ───────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clients - Zoetrop" },
    { name: "description", content: "Manage client subjects and onboarding" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  // Bootstrap owner subject for TenantCtx (same pattern as assignments.tsx)
  const ownerSubject = await getOwnerSubject(user.tenantId);
  const ctx: TenantCtx = {
    userId: user.id,
    tenantId: user.tenantId,
    subjectId: ownerSubject.id,
  };

  // Load all client subjects (excludes owner)
  const clientSubjects = await listClientSubjects(user.tenantId, ownerSubject.id);

  // Load checklist status for each client subject in parallel (Promise.all pattern)
  const checklistStatuses = await Promise.all(
    clientSubjects.map((s) => getChecklistStatus(ctx, s.id))
  );

  // Load all invites for the tenant to derive per-client invite status
  const invites = await listInvites(user.tenantId);

  return {
    user,
    clients: clientSubjects.map((s, i) => ({
      subject: s,
      checklist: checklistStatuses[i],
    })) satisfies ClientEntry[],
    invites,
  };
}

// ── Action ─────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  // ── generate-invite ────────────────────────────────────────────────────────
  if (intent === "generate-invite") {
    const rawSubjectId = formData.get("subjectId") as string | null;

    if (!rawSubjectId || !rawSubjectId.trim()) {
      return {
        intent: "generate-invite" as const,
        success: false as const,
        error: "Could not generate invite. Try again.",
        token: null,
        expiresAt: null,
        subjectId: null,
      };
    }

    // IDOR mitigation (T-01-invite-IDOR): re-resolve subjectId against the
    // practitioner's OWN client subjects — never forward raw form value unchecked.
    // Uses getSubjectById scoped to user.tenantId so cross-tenant subjectId returns null.
    const verifiedSubject = await getSubjectById(rawSubjectId.trim(), user.tenantId);
    if (!verifiedSubject) {
      return {
        intent: "generate-invite" as const,
        success: false as const,
        error: "Could not generate invite. Try again.",
        token: null,
        expiresAt: null,
        subjectId: null,
      };
    }

    try {
      const result = await generateInvite({
        inviter: user,
        role: "client",
        subjectId: verifiedSubject.id,  // server-verified id, not raw form value
      });
      return {
        intent: "generate-invite" as const,
        success: true as const,
        error: null,
        token: result.token,              // returned exactly once (T-01-token-exposure)
        expiresAt: result.expiresAt.toISOString(),
        subjectId: verifiedSubject.id,
      };
    } catch {
      return {
        intent: "generate-invite" as const,
        success: false as const,
        error: "Could not generate invite. Try again.",
        token: null,
        expiresAt: null,
        subjectId: null,
      };
    }
  }

  // ── revoke-invite ──────────────────────────────────────────────────────────
  if (intent === "revoke-invite") {
    const inviteId = formData.get("inviteId") as string | null;

    if (!inviteId || !inviteId.trim()) {
      return {
        intent: "revoke-invite" as const,
        success: false as const,
        error: "Could not revoke invite. Try again.",
      };
    }

    try {
      // IDOR mitigation (T-01-revoke-IDOR): tenantId from session, never form
      const { revoked } = await revokeInvite({
        id: inviteId.trim(),
        tenantId: user.tenantId,         // from session — never trust form
      });
      if (!revoked) {
        return {
          intent: "revoke-invite" as const,
          success: false as const,
          error: "Could not revoke invite. Try again.",
        };
      }
      return {
        intent: "revoke-invite" as const,
        success: true as const,
        error: null,
      };
    } catch {
      return {
        intent: "revoke-invite" as const,
        success: false as const,
        error: "Could not revoke invite. Try again.",
      };
    }
  }

  return {
    intent: null as null,
    success: false as const,
    error: "Unknown intent",
  };
}

// ── Checklist strip helpers ────────────────────────────────────────────────────

type ChecklistState = "missing" | "in_progress" | "done";

const STATE_GLYPH: Record<ChecklistState, string> = {
  done:        "✓",
  in_progress: "·",
  missing:     "∘",
};

const STATE_COLOR: Record<ChecklistState, string> = {
  done:        "var(--optimal)",
  in_progress: "var(--borderline)",
  missing:     "var(--text-faint)",
};

const STATE_LABEL: Record<ChecklistState, string> = {
  done:        "done",
  in_progress: "in progress",
  missing:     "missing",
};

function ChecklistStrip({ checklist }: { checklist: ChecklistStatus }) {
  const intakeState = checklist.intake as ChecklistState;
  const geneticsState = checklist.genetics as ChecklistState;
  const labsState = checklist.labs as ChecklistState;
  const whoopState = checklist.whoop as ChecklistState;
  const reportState = checklist.report as ChecklistState;
  const protocolState = checklist.protocol as ChecklistState;

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--gap-sm)",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span aria-label={`Intake: ${STATE_LABEL[intakeState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[intakeState] }}>intake{STATE_GLYPH[intakeState]}</span>
      <span aria-label={`Genetics: ${STATE_LABEL[geneticsState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[geneticsState] }}>gen{STATE_GLYPH[geneticsState]}</span>
      <span aria-label={`Labs: ${STATE_LABEL[labsState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[labsState] }}>lab{STATE_GLYPH[labsState]}</span>
      <span aria-label={`WHOOP: ${STATE_LABEL[whoopState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[whoopState] }}>whp{STATE_GLYPH[whoopState]}</span>
      <span aria-label={`Report: ${STATE_LABEL[reportState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[reportState] }}>report{STATE_GLYPH[reportState]}</span>
      <span aria-label={`Protocol: ${STATE_LABEL[protocolState]}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: STATE_COLOR[protocolState] }}>protocol{STATE_GLYPH[protocolState]}</span>
    </div>
  );
}

// ── Invite status badge ────────────────────────────────────────────────────────

function deriveClientInviteStatus(
  subjectId: string,
  invites: InviteRow[]
): "not_sent" | "pending" | "redeemed" {
  const inv = invites.find((i) => i.subjectId === subjectId);
  if (!inv) return "not_sent";
  if (inv.consumedAt) return "redeemed";
  return "pending";
}

function deriveClientInvite(
  subjectId: string,
  invites: InviteRow[]
): InviteRow | null {
  return invites.find((i) => i.subjectId === subjectId) ?? null;
}

// ── Per-client row ─────────────────────────────────────────────────────────────

function ClientRow({
  entry,
  invites,
  actionData,
}: {
  entry: ClientEntry;
  invites: InviteRow[];
  actionData: Awaited<ReturnType<typeof action>> | null | undefined;
}) {
  const { subject, checklist } = entry;
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteStatus = deriveClientInviteStatus(subject.id, invites);
  const existingInvite = deriveClientInvite(subject.id, invites);

  // Was this client's invite just generated in the last action?
  const justGenerated =
    actionData &&
    "intent" in actionData &&
    actionData.intent === "generate-invite" &&
    actionData.success &&
    actionData.subjectId === subject.id;

  const revealToken =
    justGenerated && actionData.success ? actionData.token : null;
  const revealExpiry =
    justGenerated && actionData.success ? actionData.expiresAt : null;

  // Program type display label
  const PROGRAM_LABEL: Record<string, string> = {
    cessation: "Cessation",
    substance_taper: "Substance taper",
    lifestyle_modification: "Lifestyle modification",
    general: "General",
  };

  const programLabel = subject.programType
    ? (PROGRAM_LABEL[subject.programType] ?? subject.programType)
    : null;

  const handleCopy = () => {
    if (revealToken) {
      navigator.clipboard.writeText(revealToken).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <tr
        style={{
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* NAME */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)" }}>
            <Avatar name={subject.displayName} size={24} />
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  color: "var(--text)",
                }}
              >
                {subject.displayName}
              </div>
              {subject.contactEmail && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {subject.contactEmail}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* PROGRAM */}
        <td style={{ padding: "12px 14px" }}>
          {programLabel ? (
            <div>
              <Badge tone="neutral" variant="soft">
                {programLabel}
              </Badge>
              {subject.programStartDate && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  {new Date(subject.programStartDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>—</span>
          )}
        </td>

        {/* STATUS */}
        <td style={{ padding: "12px 14px" }}>
          {inviteStatus === "redeemed" && (
            <Badge tone="vital" variant="soft">Active</Badge>
          )}
          {inviteStatus === "pending" && (
            <Badge tone="energy" variant="soft">Pending</Badge>
          )}
          {inviteStatus === "not_sent" && (
            <Badge tone="neutral" variant="outline">No invite</Badge>
          )}
        </td>

        {/* ONBOARDING */}
        <td style={{ padding: "12px 14px" }}>
          <ChecklistStrip checklist={checklist} />
        </td>

        {/* ACTIONS */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)", flexWrap: "wrap" }}>
            {/* View — switches active subject to this client */}
            <Form method="post" action="/subject-switch">
              <input type="hidden" name="subjectId" value={subject.id} />
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                aria-label={`View ${subject.displayName}`}
              >
                View
              </Button>
            </Form>

            {/* Generate invite (only when not yet pending/redeemed) */}
            {inviteStatus === "not_sent" && (
              <Form method="post">
                <input type="hidden" name="_intent" value="generate-invite" />
                <input type="hidden" name="subjectId" value={subject.id} />
                <Button variant="secondary" size="sm" type="submit">
                  Generate invite link
                </Button>
              </Form>
            )}

            {/* Revoke pending invite */}
            {inviteStatus === "pending" && existingInvite && !revealToken && (
              revokeConfirm ? (
                <Form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="_intent" value="revoke-invite" />
                  <input type="hidden" name="inviteId" value={existingInvite.id} />
                  <Button
                    variant="danger"
                    size="sm"
                    type="submit"
                    aria-label={`Confirm revoke invite for ${subject.displayName}`}
                  >
                    Confirm revoke
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRevokeConfirm(false)}
                    style={{
                      marginLeft: 8,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Keep invite
                  </button>
                </Form>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setRevokeConfirm(true)}
                  style={{ color: "var(--danger)" }}
                >
                  Revoke
                </Button>
              )
            )}
          </div>
        </td>
      </tr>

      {/* Token reveal row — shown exactly once after generate-invite success */}
      {revealToken && (
        <tr>
          <td
            colSpan={5}
            style={{ padding: "0 14px 14px" }}
          >
            <div
              style={{
                background: "var(--focus-50)",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--gap-lg)",
              }}
            >
              {/* Eyebrow */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  marginBottom: 8,
                }}
              >
                INVITE LINK — SHOWN ONCE
              </div>

              {/* Token block */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-sm)",
                  marginBottom: 10,
                }}
              >
                <code
                  style={{
                    display: "block",
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--gap-sm) var(--gap-md)",
                    wordBreak: "break-all",
                    userSelect: "text",
                  }}
                >
                  {revealToken}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  aria-label="Copy token to clipboard"
                  style={{
                    background: "none",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {copied ? (
                    <Check size={14} style={{ color: "var(--optimal)" }} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Copied confirmation (aria-live for screen readers) */}
              <div
                aria-live="polite"
                style={{
                  fontSize: "var(--text-2xs)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--optimal)",
                  marginBottom: copied ? 6 : 0,
                  minHeight: copied ? undefined : 0,
                }}
              >
                {copied ? "Copied!" : ""}
              </div>

              {/* Expiry */}
              {revealExpiry && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Expires{" "}
                  {new Date(revealExpiry).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}

              {/* Warning */}
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                Copy this token now — it will not be shown again. Deliver it to
                your client out of band (email, message, or another secure channel).
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Default component ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { clients, invites } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const hasClients = clients.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="CLIENTS"
        title="Clients"
        right={
          <Button
            variant="primary"
            iconLeft={<Plus size={16} />}
            onClick={() => { window.location.href = "/clients/new"; }}
          >
            Add client
          </Button>
        }
      />

      {/* Action-level error (non-intent errors) */}
      {actionData &&
        "intent" in actionData &&
        actionData.intent === "revoke-invite" &&
        !actionData.success &&
        actionData.error && (
          <p
            style={{
              marginBottom: "var(--gap-lg)",
              color: "var(--danger)",
              fontSize: "var(--text-sm)",
            }}
          >
            {actionData.error}
          </p>
        )}

      {!hasClients ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <Card elevation="sm" padding="none">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "var(--gap-3xl) var(--gap-2xl)",
            }}
          >
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
              NO CLIENTS YET
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--text-lg)",
                marginBottom: 12,
              }}
            >
              Add your first client
            </div>
            <p
              style={{
                margin: "0 0 24px",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                maxWidth: 400,
              }}
            >
              Create a client record to begin. You can enter data before they
              redeem their invite.
            </p>
            <Button
              variant="primary"
              iconLeft={<Plus size={16} />}
              onClick={() => { window.location.href = "/clients/new"; }}
            >
              Add client
            </Button>
          </div>
        </Card>
      ) : (
        /* ── Client table ─────────────────────────────────────────────────── */
        <Card elevation="sm" padding="none">
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "var(--text-sm)",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-sunken)",
                  }}
                >
                  {["NAME", "PROGRAM", "STATUS", "ONBOARDING", ""].map((col, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-2xs)",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((entry) => (
                  <ClientRow
                    key={entry.subject.id}
                    entry={entry as ClientEntry}
                    invites={invites as InviteRow[]}
                    actionData={actionData}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
