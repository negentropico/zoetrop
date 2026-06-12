import { useState, useLayoutEffect, useCallback } from "react";
import { Form, Link, useLoaderData, useActionData, useFetcher } from "react-router";
import type { Route } from "./+types/index";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Switch } from "~/components/ui/Switch";
import { Avatar } from "~/components/ui/Avatar";
import { PageHeader } from "~/components/ui/PageHeader";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { requireUser, requireRole, can } from "~/lib/authz.server";
import { generateInvite, listInvites } from "~/lib/invites.server";
import { auth } from "~/lib/auth.server";

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteRow = Awaited<ReturnType<typeof listInvites>>[number];

// ── Meta ──────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Account settings - Zoetrop" },
    { name: "description", content: "Manage your account, invites, and preferences" },
  ];
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  // Contract (WR-06): /settings is available to ALL authenticated roles for
  // self-management (Profile / Security / Preferences). Only the Invites surface
  // is role-gated — hidden here via canInviteClient and enforced server-side in
  // the generate-invite action and the revoke resource route. Clients are not
  // 403'd from the page itself, only from invites.
  const { user } = await requireUser(request);

  // Compute capabilities on the server and pass booleans through loader data so
  // the (client-rendered) component never imports the server-only authz module.
  // canInviteClient also requires a tenantId (invites are tenant-scoped, T-031-SET-5).
  const canInviteClient = can(user, "invite:client") && !!user.tenantId;
  const canInvitePractitioner = can(user, "invite:practitioner");
  // Assignments surface is owner-only (AUTH-03, D-07): only owners manage practitioner→subject assignments
  const canManageAssignments = user.role === "owner" && !!user.tenantId;

  // Load invites only for roles that can invite (owner or practitioner) AND
  // that have a tenant. A missing tenantId yields an empty list (fail-closed).
  let invites: InviteRow[] = [];
  if (canInviteClient) {
    invites = await listInvites(user.tenantId!);
  }

  return { user, invites, canInviteClient, canInvitePractitioner, canManageAssignments };
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  // ── update-profile ──────────────────────────────────────────────────────────
  if (intent === "update-profile") {
    // WR-04: validate name — a crafted POST can omit it (null) or send whitespace.
    const name = formData.get("name");
    if (typeof name !== "string" || !name.trim()) {
      return {
        intent: "update-profile",
        success: false,
        error: "Please enter your name.",
      };
    }
    try {
      await auth.api.updateUser({
        body: { name: name.trim() },
        headers: request.headers,
      });
      return { intent: "update-profile", success: true, error: null };
    } catch {
      return {
        intent: "update-profile",
        success: false,
        error: "Unable to save changes. Try again.",
      };
    }
  }

  // ── change-password ─────────────────────────────────────────────────────────
  if (intent === "change-password") {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate: length ≥ 8 (T-031-SET-3: no escalation path)
    if (!newPassword || newPassword.length < 8) {
      return {
        intent: "change-password",
        success: false,
        error: "Password must be at least 8 characters.",
        errorField: "newPassword",
      };
    }
    // Validate: confirm matches
    if (newPassword !== confirmPassword) {
      return {
        intent: "change-password",
        success: false,
        error: "Passwords do not match.",
        errorField: "confirmPassword",
      };
    }

    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword },
        headers: request.headers,
      });
      return { intent: "change-password", success: true, error: null, errorField: null };
    } catch (err) {
      // WR-07: only assert "wrong current password" when the error actually says
      // so. Better-Auth raises an invalid-password error for a wrong
      // currentPassword; any other failure (network, backend, rate-limit) must
      // not be misreported as a credential problem.
      const raw = err instanceof Error ? err.message.toLowerCase() : "";
      const wrongCurrent = raw.includes("invalid") || raw.includes("incorrect");
      return {
        intent: "change-password",
        success: false,
        error: wrongCurrent
          ? "Current password is incorrect."
          : "Unable to change your password. Try again.",
        errorField: wrongCurrent ? "currentPassword" : null,
      };
    }
  }

  // ── generate-invite ─────────────────────────────────────────────────────────
  if (intent === "generate-invite") {
    // Server gate: client is 403'd even with a crafted request (T-031-SET-1 / D-12)
    requireRole(user, ["owner", "practitioner"]);

    const role = formData.get("role") as "practitioner" | "client";
    if (role !== "practitioner" && role !== "client") {
      return {
        intent: "generate-invite",
        success: false,
        error: "Unable to generate invite. Try again.",
        token: null,
        url: null,
        role: null,
        expiresAt: null,
      };
    }

    // WR-05: re-assert the capability for the REQUESTED role at the boundary.
    // requireRole above only proves owner|practitioner — it does NOT prove this
    // actor may mint THIS role. A practitioner cannot invite a practitioner (the
    // UI hides that pill, but a crafted POST must be denied here too). This makes
    // the authorization intent explicit rather than relying solely on
    // generateInvite's internal can() check (defense-in-depth).
    if (!can(user, `invite:${role}`)) {
      return {
        intent: "generate-invite",
        success: false,
        error: "You can't invite that role.",
        token: null,
        url: null,
        role: null,
        expiresAt: null,
      };
    }

    try {
      // generateInvite re-enforces per-role policy via can() (D-10)
      const result = await generateInvite({ inviter: user, role });

      // Build the invite URL — points to the public sign-up surface with the raw token
      // Structured so email-send can be layered later without rework (D-09)
      const baseUrl = new URL(request.url).origin;
      const inviteUrl = `${baseUrl}/login?inviteToken=${encodeURIComponent(result.token)}&role=${result.role}`;

      return {
        intent: "generate-invite",
        success: true,
        error: null,
        token: result.token,
        url: inviteUrl,
        role: result.role,
        expiresAt: result.expiresAt.toISOString(),
      };
    } catch {
      return {
        intent: "generate-invite",
        success: false,
        error: "Unable to generate invite. Try again.",
        token: null,
        url: null,
        role: null,
        expiresAt: null,
      };
    }
  }

  return { intent: null, success: false, error: "Unknown intent" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveInviteStatus(
  invite: InviteRow
): "active" | "consumed" | "expired" | "revoked" {
  if (invite.revokedAt) return "revoked";
  if (invite.consumedAt) return "consumed";
  if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) return "expired";
  return "active";
}

const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE",
  consumed: "USED",
  expired: "EXPIRED",
  revoked: "REVOKED",
};

const STATUS_STYLE: Record<
  string,
  { bg: string; color: string }
> = {
  active:   { bg: "var(--vital-50)",     color: "var(--vital-400)" },
  consumed: { bg: "var(--surface-sunken)", color: "var(--text-faint)" },
  expired:  { bg: "var(--surface-sunken)", color: "var(--text-muted)" },
  revoked:  { bg: "var(--danger-bg)",    color: "var(--danger)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.expired;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: "var(--radius-pill)",
        background: s.bg,
        color: s.color,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        fontWeight: 400,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status] ?? status.toUpperCase()}
    </span>
  );
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Generated link card ───────────────────────────────────────────────────────

function GeneratedLinkCard({
  url,
  role,
  onDismiss,
}: {
  url: string;
  role: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: focus the input so user can copy manually
    }
  }, [url]);

  return (
    <div
      style={{
        position: "relative",
        padding: "16px 20px",
        background: "var(--focus-50)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        marginBottom: "var(--gap-xl)",
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss invite link"
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 16,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>

      <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
        INVITE LINK — {role.toUpperCase()} — EXPIRES IN 7 DAYS
      </div>

      {/* URL display */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          background: "var(--surface-2)",
          border: "1.5px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          padding: "8px 12px",
          wordBreak: "break-all",
          color: "var(--text)",
          marginBottom: 12,
        }}
        title={url}
      >
        {url}
      </div>

      {/* aria-live region for copy announcement */}
      <div aria-live="polite" style={{ position: "absolute", left: -9999 }}>
        {copied ? "Invite link copied to clipboard" : ""}
      </div>

      <Button
        variant="secondary"
        size="sm"
        iconLeft={copied ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
        onClick={handleCopy}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

// ── Default component ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, invites, canInviteClient, canInvitePractitioner, canManageAssignments } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user.name ?? "");

  // ── Theme state (mirrors ThemeToggle, same localStorage key) ──────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    try {
      const stored = localStorage.getItem("zt-theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const handleThemeToggle = (next: boolean) => {
    try {
      localStorage.setItem("zt-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDarkMode(next);
  };

  // ── Invite generate state ──────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<"practitioner" | "client">(
    canInvitePractitioner ? "practitioner" : "client"
  );
  const [generatedLink, setGeneratedLink] = useState<{
    url: string;
    role: string;
  } | null>(null);

  // Stable reference to generated link from action data
  const latestGenerated =
    actionData &&
    "intent" in actionData &&
    actionData.intent === "generate-invite" &&
    actionData.success &&
    "url" in actionData &&
    actionData.url &&
    "role" in actionData &&
    actionData.role
      ? { url: actionData.url as string, role: actionData.role as string }
      : null;

  const activeGenerated = generatedLink ?? latestGenerated;

  // ── Derive intent-scoped action results ────────────────────────────────────
  const profileAction =
    actionData && "intent" in actionData && actionData.intent === "update-profile"
      ? actionData
      : null;
  const passwordAction =
    actionData && "intent" in actionData && actionData.intent === "change-password"
      ? actionData
      : null;
  const inviteAction =
    actionData && "intent" in actionData && actionData.intent === "generate-invite"
      ? actionData
      : null;

  // ── Coming soon section helper ─────────────────────────────────────────────
  function ComingSoon({
    eyebrow,
    heading,
  }: {
    eyebrow: string;
    heading: string;
  }) {
    return (
      <Card
        elevation="flat"
        padding="lg"
        style={{ background: "var(--surface-sunken)", cursor: "default" }}
      >
        <div
          className="zt-eyebrow"
          style={{ marginBottom: 8, color: "var(--text-muted)" }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "var(--text-lg)",
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          {heading}
        </div>
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Coming in a future update.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="ACCOUNT" title="Account settings" />

      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-2xl)",
        }}
      >
        {/* ── 1. PROFILE ──────────────────────────────────────────────────── */}
        <Card elevation="sm" padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
            PROFILE
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--text-lg)",
              marginBottom: 20,
            }}
          >
            Profile
          </div>

          <Form method="post">
            <input type="hidden" name="_intent" value="update-profile" />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar + email row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Avatar name={user.name ?? ""} size={48} />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={user.email}
                  disabled
                  style={{ flex: 1 }}
                />
              </div>

              {/* Display name */}
              <Input
                label="Display name"
                name="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />

              {/* Save feedback */}
              {profileAction?.success && (
                <p
                  style={{
                    margin: 0,
                    color: "var(--vital-400)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Changes saved.
                </p>
              )}
              {"error" in (profileAction ?? {}) && profileAction?.error && (
                <p
                  style={{
                    margin: 0,
                    color: "var(--danger)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {profileAction.error}
                </p>
              )}

              <div>
                <Button variant="primary" type="submit">
                  Save changes
                </Button>
              </div>
            </div>
          </Form>
        </Card>

        {/* ── 2. SECURITY ─────────────────────────────────────────────────── */}
        <Card elevation="sm" padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
            SECURITY
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--text-lg)",
              marginBottom: 20,
            }}
          >
            Security
          </div>

          <Form method="post">
            <input type="hidden" name="_intent" value="change-password" />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                label="Current password"
                name="currentPassword"
                type="password"
                placeholder="Enter your current password"
                error={
                  passwordAction &&
                  "errorField" in passwordAction &&
                  passwordAction.errorField === "currentPassword"
                    ? (passwordAction.error as string)
                    : null
                }
              />
              <Input
                label="New password"
                name="newPassword"
                type="password"
                placeholder="At least 8 characters"
                error={
                  passwordAction &&
                  "errorField" in passwordAction &&
                  passwordAction.errorField === "newPassword"
                    ? (passwordAction.error as string)
                    : null
                }
              />
              <Input
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat your new password"
                error={
                  passwordAction &&
                  "errorField" in passwordAction &&
                  passwordAction.errorField === "confirmPassword"
                    ? (passwordAction.error as string)
                    : null
                }
              />

              {passwordAction?.success && (
                <p
                  style={{
                    margin: 0,
                    color: "var(--vital-400)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Password updated.
                </p>
              )}

              <div>
                <Button variant="primary" type="submit">
                  Save password
                </Button>
              </div>
            </div>
          </Form>
        </Card>

        {/* ── 3. INVITES (Task 2 fills this) ──────────────────────────────── */}
        {canInviteClient && (
          <Card elevation="sm" padding="lg">
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
              INVITES
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "var(--text-lg)",
                marginBottom: 20,
              }}
            >
              Invites
            </div>

            {/* invite panel — Task 2 */}

            {/* Role selector — zt-pill atoms (round 3: chip → pill) */}
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--gap-lg)" }}>
              {canInvitePractitioner && (
                <button
                  type="button"
                  onClick={() => setSelectedRole("practitioner")}
                  className={
                    "zt-pill" + (selectedRole === "practitioner" ? " is-active" : "")
                  }
                >
                  Practitioner
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRole("client")}
                className={"zt-pill" + (selectedRole === "client" ? " is-active" : "")}
              >
                Client
              </button>
            </div>

            {/* Generate invite form */}
            <Form method="post" style={{ marginBottom: 24 }}>
              <input type="hidden" name="_intent" value="generate-invite" />
              <input type="hidden" name="role" value={selectedRole} />
              <Button
                variant="primary"
                type="submit"
                iconLeft={<Plus size={16} />}
              >
                Generate invite link
              </Button>
              {inviteAction && "error" in inviteAction && inviteAction.error && (
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    color: "var(--danger)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {inviteAction.error as string}
                </p>
              )}
            </Form>

            {/* Generated link card */}
            {activeGenerated && (
              <GeneratedLinkCard
                url={activeGenerated.url}
                role={activeGenerated.role}
                onDismiss={() => setGeneratedLink(null)}
              />
            )}

            {/* Active invites table */}
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
              ACTIVE INVITES
            </div>

            {invites.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                No active invites. Generate a link to invite a team member.
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
                      {["ROLE", "STATUS", "EXPIRES", "CREATED", "ACTION"].map(
                        (col) => (
                          <th
                            key={col}
                            style={{
                              // Round 3: row rhythm rides the density scale
                              padding: "var(--gap-row) 14px",
                              textAlign: "left",
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-2xs)",
                              color: "var(--text-muted)",
                              fontWeight: 400,
                            }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite, i) => (
                      <tr
                        key={invite.id}
                        style={{
                          borderTop:
                            i > 0 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "var(--gap-row) 14px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-sm)",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {invite.role}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <StatusBadge status={deriveInviteStatus(invite)} />
                        </td>
                        <td
                          style={{
                            padding: "var(--gap-row) 14px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatDate(invite.expiresAt)}
                        </td>
                        <td
                          style={{
                            padding: "var(--gap-row) 14px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatDate(invite.createdAt)}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <InviteTableRowAction invite={invite} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── 4. ASSIGNMENTS (owner-only) ─────────────────────────────────── */}
        {canManageAssignments && (
          <Card elevation="sm" padding="lg">
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
              ASSIGNMENTS
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "var(--text-lg)",
                marginBottom: 12,
              }}
            >
              Practitioner assignments
            </div>
            <p
              style={{
                margin: "0 0 16px",
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
              }}
            >
              Assign subjects to practitioners to grant them scoped access (AUTH-03).
            </p>
            <Link to="/settings/assignments">
              <Button variant="secondary" size="sm">
                Manage assignments
              </Button>
            </Link>
          </Card>
        )}

        {/* ── 5. PREFERENCES ──────────────────────────────────────────────── */}
        <Card elevation="sm" padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
            PREFERENCES
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--text-lg)",
              marginBottom: 20,
            }}
          >
            Preferences
          </div>

          <Switch
            tone="focus"
            size="md"
            checked={darkMode}
            onChange={handleThemeToggle}
            label="Dark mode"
          />
        </Card>

        {/* ── 6–9. Coming soon placeholders ───────────────────────────────── */}
        <ComingSoon eyebrow="INTEGRATIONS" heading="Integrations" />
        <ComingSoon eyebrow="DATA EXPORT" heading="Data export" />
        <ComingSoon eyebrow="PRIVACY & CONSENT" heading="Privacy & consent" />
        <ComingSoon eyebrow="UNITS & DISPLAY" heading="Units & display" />
      </div>
    </div>
  );
}

// ── InviteTableRowAction (used in Tasks 2/3 — wires revoke inline confirm) ────

function InviteTableRowAction({ invite }: { invite: InviteRow }) {
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher();
  const status = deriveInviteStatus(invite);

  const effectiveStatus =
    fetcher.data && (fetcher.data as { success?: boolean }).success
      ? "revoked"
      : status;

  if (effectiveStatus !== "active") {
    return (
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-faint)",
        }}
      >
        —
      </span>
    );
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
          }}
        >
          Revoke this invite? This cannot be undone.
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Keep invite
          </Button>
          <fetcher.Form
            method="post"
            action={`/settings/invites/${invite.id}/revoke`}
          >
            <Button
              variant="danger"
              size="sm"
              type="submit"
              onClick={() => setConfirming(false)}
            >
              Revoke invite
            </Button>
          </fetcher.Form>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      iconLeft={<Trash2 size={13} />}
      onClick={() => setConfirming(true)}
      style={{ color: "var(--danger)" }}
    >
      Revoke invite
    </Button>
  );
}
