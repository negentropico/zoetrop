/**
 * settings/assignments.tsx — Owner-facing practitioner→subject assignment management (AUTH-03, D-07)
 *
 * Owner-only surface: only owners may assign or unassign practitioners to subjects.
 * Practitioners and clients are 403'd in both loader and action.
 *
 * Security contracts:
 *   - requireUser: unauthenticated → redirect to /login
 *   - requireRole(user, ["owner"]): practitioners and clients get 403 (T-07-15)
 *   - assignSubject / unassignSubject are tenant-scoped via withTenantDb (psa RLS WITH CHECK)
 *   - Server-computed data only passed to component — no server-only authz module in client bundle
 */

import { Form, useLoaderData, useActionData } from "react-router";
import type { Route } from "./+types/assignments";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { requireUser, requireRole } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import {
  assignSubject,
  unassignSubject,
  listAssignments,
} from "~/lib/assignments.server";
import { getDb } from "~/lib/db.server";
import { user as userTable } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PractitionerRow {
  id: string;
  name: string;
  email: string;
}

interface SubjectRow {
  id: string;
  displayName: string;
}

interface AssignmentRow {
  id: string;
  practitionerId: string;
  subjectId: string;
  assignedAt: Date | null;
}

// ── Meta ───────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Assignments - Zoetrop" },
    { name: "description", content: "Manage practitioner-subject assignments" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);

  // Owner-only management surface (D-07, T-07-15)
  requireRole(user, ["owner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  // Bootstrap subject (admin path — bootstraps ctx.subjectId)
  const subject = await getOwnerSubject(user.tenantId);
  const ctx = {
    userId: user.id,
    tenantId: user.tenantId,
    subjectId: subject.id,
  };

  // Load active assignments for this tenant
  const assignments = await listAssignments(ctx);

  // Load practitioners in this tenant (query the user table directly as admin — no subject scoping needed)
  const db = getDb();
  const practitioners: PractitionerRow[] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(
      and(
        eq(userTable.tenantId, user.tenantId),
        eq(userTable.role, "practitioner")
      )
    );

  // Subject list — for the pilot there is one subject (the owner subject)
  const subjectList: SubjectRow[] = [{ id: subject.id, displayName: subject.displayName }];

  return {
    user,
    practitioners,
    subjects: subjectList,
    assignments,
  };
}

// ── Action ─────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);

  // Owner-only gate (T-07-15): a practitioner/client posting this form is 403'd
  requireRole(user, ["owner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  // Bootstrap ctx for assignments service
  const subject = await getOwnerSubject(user.tenantId);
  const ctx = {
    userId: user.id,
    tenantId: user.tenantId,
    subjectId: subject.id,
  };

  // ── assign-subject ──────────────────────────────────────────────────────────
  if (intent === "assign-subject") {
    const practitionerId = formData.get("practitionerId");
    const subjectId = formData.get("subjectId");

    if (typeof practitionerId !== "string" || !practitionerId.trim()) {
      return { intent: "assign-subject", success: false, error: "Select a practitioner." };
    }
    if (typeof subjectId !== "string" || !subjectId.trim()) {
      return { intent: "assign-subject", success: false, error: "Select a subject." };
    }

    try {
      const result = await assignSubject(ctx, {
        practitionerId: practitionerId.trim(),
        subjectId: subjectId.trim(),
        assignedBy: user.id,
      });
      if (result.alreadyExists) {
        return { intent: "assign-subject", success: true, error: null, note: "Already assigned." };
      }
      return { intent: "assign-subject", success: true, error: null, note: null };
    } catch {
      return { intent: "assign-subject", success: false, error: "Unable to create assignment. Try again." };
    }
  }

  // ── unassign-subject ────────────────────────────────────────────────────────
  if (intent === "unassign-subject") {
    const practitionerId = formData.get("practitionerId");
    const subjectId = formData.get("subjectId");

    if (typeof practitionerId !== "string" || !practitionerId.trim()) {
      return { intent: "unassign-subject", success: false, error: "Missing practitioner." };
    }
    if (typeof subjectId !== "string" || !subjectId.trim()) {
      return { intent: "unassign-subject", success: false, error: "Missing subject." };
    }

    try {
      const { unassigned } = await unassignSubject(ctx, {
        practitionerId: practitionerId.trim(),
        subjectId: subjectId.trim(),
      });
      if (!unassigned) {
        return { intent: "unassign-subject", success: false, error: "Assignment not found." };
      }
      return { intent: "unassign-subject", success: true, error: null };
    } catch {
      return { intent: "unassign-subject", success: false, error: "Unable to remove assignment. Try again." };
    }
  }

  return { intent: null as string | null, success: false, error: "Unknown intent" };
}

// ── Default component ──────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const { practitioners, subjects, assignments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const assignAction =
    actionData && "intent" in actionData && actionData.intent === "assign-subject"
      ? actionData
      : null;
  const unassignAction =
    actionData && "intent" in actionData && actionData.intent === "unassign-subject"
      ? actionData
      : null;

  return (
    <div>
      <PageHeader eyebrow="SETTINGS" title="Assignments" />

      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-2xl)",
        }}
      >
        {/* ── Assign section ────────────────────────────────────────────────── */}
        <Card elevation="sm" padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
            ASSIGN SUBJECT
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--text-lg)",
              marginBottom: 20,
            }}
          >
            Assign a subject to a practitioner
          </div>

          {practitioners.length === 0 ? (
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              No practitioners in your organization yet. Invite a practitioner from{" "}
              <a href="/settings" style={{ color: "var(--accent)" }}>
                Settings
              </a>{" "}
              first.
            </p>
          ) : (
            <Form method="post">
              <input type="hidden" name="_intent" value="assign-subject" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    htmlFor="practitionerId"
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    Practitioner
                  </label>
                  <select
                    id="practitionerId"
                    name="practitionerId"
                    defaultValue=""
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    <option value="" disabled>
                      Select a practitioner
                    </option>
                    {practitioners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subjectId"
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    Subject
                  </label>
                  <select
                    id="subjectId"
                    name="subjectId"
                    defaultValue=""
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    <option value="" disabled>
                      Select a subject
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {assignAction?.error && (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--danger)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {assignAction.error}
                  </p>
                )}
                {assignAction?.success && (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--vital-400)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {"note" in assignAction && assignAction.note
                      ? assignAction.note
                      : "Assignment created."}
                  </p>
                )}

                <div>
                  <Button variant="primary" type="submit">
                    Assign subject
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Card>

        {/* ── Active assignments ────────────────────────────────────────────── */}
        <Card elevation="sm" padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
            ACTIVE ASSIGNMENTS
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--text-lg)",
              marginBottom: 20,
            }}
          >
            Active assignments
          </div>

          {unassignAction?.error && (
            <p
              style={{
                marginBottom: 12,
                color: "var(--danger)",
                fontSize: "var(--text-sm)",
              }}
            >
              {unassignAction.error}
            </p>
          )}

          {assignments.length === 0 ? (
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              No active assignments. Assign a subject to a practitioner above.
            </p>
          ) : (
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
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface-sunken)",
                    }}
                  >
                    {["PRACTITIONER", "SUBJECT", "ASSIGNED", "ACTION"].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-2xs)",
                          color: "var(--text-muted)",
                          fontWeight: 400,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a: AssignmentRow, i: number) => {
                    const practitioner = practitioners.find((p) => p.id === a.practitionerId);
                    const subject = subjects.find((s) => s.id === a.subjectId);
                    return (
                      <tr
                        key={a.id}
                        style={{
                          borderTop: i > 0 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 14px",
                            color: "var(--text)",
                          }}
                        >
                          {practitioner ? practitioner.name : a.practitionerId}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            color: "var(--text)",
                          }}
                        >
                          {subject ? subject.displayName : a.subjectId}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {a.assignedAt
                            ? new Date(a.assignedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Form method="post">
                            <input type="hidden" name="_intent" value="unassign-subject" />
                            <input type="hidden" name="practitionerId" value={a.practitionerId} />
                            <input type="hidden" name="subjectId" value={a.subjectId} />
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              style={{ color: "var(--danger)" }}
                            >
                              Unassign
                            </Button>
                          </Form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
