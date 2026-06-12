import { useState, useLayoutEffect, useCallback, useRef, useEffect } from "react";
import { Form, Link, useLoaderData, useActionData, useFetcher } from "react-router";
import type { Route } from "./+types/index";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Switch } from "~/components/ui/Switch";
import { Avatar } from "~/components/ui/Avatar";
import { PageHeader } from "~/components/ui/PageHeader";
import { Copy, Check, Plus, X } from "lucide-react";
import { requireUser, requireRole, can } from "~/lib/authz.server";
import { generateInvite, listInvites } from "~/lib/invites.server";
import { auth } from "~/lib/auth.server";

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteRow = Awaited<ReturnType<typeof listInvites>>[number];

// ── Role-label mapping (W4c, INTEGRATION-PLAN role-name decision) ──────────────
//
// The design return proposes invite roles "Viewer" / "Clinician"; the schema enum
// is owner / practitioner / client (db/schema.ts appRoleEnum). This is a UI-LABEL
// mapping ONLY — no enum migration. The DB stores owner/practitioner/client; the
// settings surface displays Owner / Clinician / Viewer.
//   Clinician → practitioner   ·   Viewer → client   ·   Owner → owner
const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  practitioner: "Clinician",
  client: "Viewer",
};

// Assignable roles for the inline create picker (never "owner" — owners aren't
// invited). Each maps the design label to the schema enum the action expects.
// Ordered Viewer → Clinician to match the design's pill order.
const ASSIGNABLE_ROLES: { enumValue: "client" | "practitioner"; label: string; desc: string }[] = [
  { enumValue: "client", label: "Viewer", desc: "Dashboards and trends" },
  { enumValue: "practitioner", label: "Clinician", desc: "Adds lab documents and protocol detail" },
];

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

  // Map each invite's role enum to its display label here so the (client-rendered)
  // component renders the designed Viewer/Clinician chips without re-deriving.
  const inviteRows = invites.map((inv) => ({
    ...inv,
    roleLabel: ROLE_LABEL[inv.role] ?? inv.role,
  }));

  return { user, invites: inviteRows, canInviteClient, canInvitePractitioner, canManageAssignments };
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

// Compact status word for the invite sub-line (design: "status · sent").
const STATUS_WORD: Record<string, string> = {
  active: "active",
  consumed: "accepted",
  expired: "expired",
  revoked: "revoked",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Role chip (design: neutral zt-pill; Owner = accent) ────────────────────────

function RoleChip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      style={{
        padding: "4px 11px",
        background: accent ? "var(--focus-50)" : "var(--surface-sunken)",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        color: accent ? "var(--accent)" : "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        display: "inline-block",
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      {label}
    </span>
  );
}

// ── Copy-link affordance ───────────────────────────────────────────────────────
//
// The real invite model is a single-use, role-scoped TOKEN delivered by
// copy-link — the invites table has no email column and no email-send path
// (invites.server.ts / db schema). So "Send invite" mints a real link the owner
// pastes to the intended recipient. The email field above is advisory recipient
// context (the design idiom) — it gates the button per the design contract but is
// not persisted (no column to store it). See deferred-items.md.

function CopyLinkRow({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the link text is still selectable below */
    }
  }, [url]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--gap-md)",
        padding: "var(--gap-row) var(--gap-card)",
        borderBottom: "1px solid var(--border)",
        background: "var(--focus-50)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="zt-eyebrow" style={{ marginBottom: 3, color: "var(--accent)" }}>
          INVITE LINK — COPY &amp; SEND — EXPIRES IN 7 DAYS
        </div>
        <div
          title={url}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {url}
        </div>
      </div>
      <div aria-live="polite" style={{ position: "absolute", left: -9999 }}>
        {copied ? "Invite link copied to clipboard" : ""}
      </div>
      <button
        type="button"
        className="zt-pill"
        onClick={handleCopy}
        style={{ flex: "0 0 auto" }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" className="zt-fact" title="Dismiss" onClick={onDismiss}>
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Revoke action (design: zt-fact, deficient hover) ──────────────────────────
//
// Uses a fetcher (NOT a navigating Form) so the POST to the action-only resource
// route /settings/invites/:inviteId/revoke does not navigate away from /settings
// to the route's bare JSON response. Mirrors the original InviteTableRowAction
// fetcher pattern.

function RevokeAction({ inviteId }: { inviteId: string }) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" action={`/settings/invites/${inviteId}/revoke`}>
      <button
        type="submit"
        className="zt-fact"
        title="Revoke invite"
        disabled={submitting}
        style={{ "--fact": "var(--deficient)", "--fact-bg": "var(--deficient-bg)" } as React.CSSProperties}
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </fetcher.Form>
  );
}

// ── Invites flow (design W4c: inline expanding create row + list + revoke) ─────

function InvitesFlow({
  invites,
  canInvitePractitioner,
}: {
  invites: (InviteRow & { roleLabel: string })[];
  canInvitePractitioner: boolean;
}) {
  const actionData = useActionData<typeof action>();

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  // role holds the SCHEMA enum value the create action expects (client | practitioner).
  const [role, setRole] = useState<"client" | "practitioner">("client");

  // Owners may invite both roles; practitioners may invite Viewers (client) only.
  const roles = canInvitePractitioner
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter((r) => r.enumValue === "client");

  // Design contract: Send gates on a parseable email (advisory recipient).
  const valid = /.+@.+\..+/.test(email.trim());

  // The most recent generated copy-link from the action (real backend result).
  const generated =
    actionData &&
    "intent" in actionData &&
    actionData.intent === "generate-invite" &&
    actionData.success &&
    "url" in actionData &&
    actionData.url
      ? { url: actionData.url as string }
      : null;

  const inviteError =
    actionData &&
    "intent" in actionData &&
    actionData.intent === "generate-invite" &&
    !actionData.success &&
    "error" in actionData
      ? (actionData.error as string)
      : null;

  const [dismissedLink, setDismissedLink] = useState(false);
  const showLink = generated && !dismissedLink;

  // Collapse the create row + reset its fields once a link is minted.
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (generated && generated.url !== lastUrlRef.current) {
      lastUrlRef.current = generated.url;
      setAdding(false);
      setEmail("");
      setRole("client");
      setDismissedLink(false);
    }
  }, [generated]);

  return (
    <section>
      <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
        INVITES · {invites.length}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "var(--text-lg)",
          marginBottom: 16,
        }}
      >
        Invites
      </div>

      <Card padding="none" elevation="sm">
        {/* inline expanding create row (owner pick, round 5) */}
        {adding ? (
          <Form
            method="post"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--gap-md)",
              padding: "var(--gap-row) var(--gap-card)",
              borderBottom: "1px solid var(--border)",
              flexWrap: "wrap",
            }}
          >
            <input type="hidden" name="_intent" value="generate-invite" />
            <input type="hidden" name="role" value={role} />
            <input
              className="zt-fedit"
              type="email"
              name="email"
              placeholder="email@example.com"
              aria-label="Invite recipient email"
              autoFocus
              value={email}
              style={{ flex: "1 1 160px", minWidth: 0, width: "auto", textAlign: "left", fontSize: "var(--text-xs)" }}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <span style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
              {roles.map((r) => (
                <button
                  key={r.enumValue}
                  type="button"
                  className={"zt-pill" + (role === r.enumValue ? " is-active" : "")}
                  style={{ padding: "4px 11px" }}
                  title={r.desc}
                  onClick={() => setRole(r.enumValue)}
                >
                  {r.label}
                </button>
              ))}
            </span>
            <span style={{ display: "flex", gap: 4, alignItems: "center", flex: "0 0 auto" }}>
              <button
                type="submit"
                className="zt-btn-ink"
                style={{ padding: "6px 14px", fontSize: "var(--text-xs)" }}
                disabled={!valid}
              >
                Send invite
              </button>
              <button type="button" className="zt-fact" title="Cancel" onClick={() => setAdding(false)}>
                <X size={14} strokeWidth={2} />
              </button>
            </span>
          </Form>
        ) : (
          <button
            type="button"
            className="zt-mrow"
            onClick={() => setAdding(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              border: "none",
              borderBottom:
                invites.length || showLink ? "1px solid var(--border)" : "none",
              padding: "var(--gap-row) var(--gap-card)",
              background: "none",
              cursor: "pointer",
              font: "inherit",
              textAlign: "left",
            }}
          >
            <Plus size={16} strokeWidth={2} color="var(--accent)" />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--accent)" }}>
              Invite by email
            </span>
          </button>
        )}

        {inviteError && (
          <div
            style={{
              padding: "var(--gap-row) var(--gap-card)",
              borderBottom: "1px solid var(--border)",
              color: "var(--danger)",
              fontSize: "var(--text-xs)",
            }}
          >
            {inviteError}
          </div>
        )}

        {/* real minted copy-link (the actual delivery artifact) */}
        {showLink && (
          <CopyLinkRow url={generated!.url} onDismiss={() => setDismissedLink(true)} />
        )}

        {invites.length === 0 ? (
          <div style={{ padding: "var(--gap-lg) var(--gap-card)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            No invitations yet.
          </div>
        ) : (
          invites.map((inv, i) => {
            const status = deriveInviteStatus(inv);
            const isOwner = inv.role === "owner";
            return (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-md)",
                  padding: "var(--gap-row) var(--gap-card)",
                  borderBottom: i < invites.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="zt-tnum"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    invite · {inv.id.slice(0, 8)}
                  </div>
                  <div className="zt-eyebrow" style={{ marginTop: 3, letterSpacing: "0.06em", color: "var(--text-faint)" }}>
                    {STATUS_WORD[status] ?? status} · sent {formatDate(inv.createdAt)}
                  </div>
                </div>
                <RoleChip label={inv.roleLabel} accent={isOwner} />
                {status === "active" ? (
                  <RevokeAction inviteId={inv.id} />
                ) : (
                  <span style={{ width: 28, textAlign: "center", color: "var(--text-faint)", fontSize: "var(--text-xs)" }}>—</span>
                )}
              </div>
            );
          })
        )}
      </Card>

      {/* PROPOSED role-semantics caption under the card */}
      <div style={{ marginTop: "var(--gap-md)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textWrap: "pretty" }}>
        <span className="zt-eyebrow" style={{ marginRight: 6 }}>PROPOSED</span>
        {ASSIGNABLE_ROLES.map((r) => `${r.label} — ${r.desc.toLowerCase()}`).join(" · ")}
      </div>
    </section>
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

  // ── Derive intent-scoped action results ────────────────────────────────────
  const profileAction =
    actionData && "intent" in actionData && actionData.intent === "update-profile"
      ? actionData
      : null;
  const passwordAction =
    actionData && "intent" in actionData && actionData.intent === "change-password"
      ? actionData
      : null;

  return (
    <div data-screen-label="Settings">
      <PageHeader eyebrow="ACCOUNT" title="Settings" />

      {/* Asymmetric split (account 1 / invites 1.6) via zt-settings-grid (W0). */}
      <div className="zt-settings-grid">
        {/* ── LEFT COLUMN — account ───────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-xl)" }}>
          {/* PROFILE */}
          <section>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>PROFILE</div>
            <Card elevation="sm" padding="lg">
              <Form method="post">
                <input type="hidden" name="_intent" value="update-profile" />
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={user.name ?? ""} size={48} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{user.name || "Owner"}</div>
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={user.email}
                      >
                        {user.email}
                      </div>
                    </div>
                    <RoleChip label={ROLE_LABEL[user.role ?? ""] ?? user.role ?? "—"} accent={user.role === "owner"} />
                  </div>

                  <Input
                    label="Display name"
                    name="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />

                  {profileAction?.success && (
                    <p style={{ margin: 0, color: "var(--vital-400)", fontSize: "var(--text-sm)" }}>
                      Changes saved.
                    </p>
                  )}
                  {"error" in (profileAction ?? {}) && profileAction?.error && (
                    <p style={{ margin: 0, color: "var(--danger)", fontSize: "var(--text-sm)" }}>
                      {profileAction.error}
                    </p>
                  )}

                  <div>
                    <Button variant="primary" type="submit">Save changes</Button>
                  </div>
                </div>
              </Form>
            </Card>
          </section>

          {/* SECURITY */}
          <section>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>SECURITY</div>
            <Card elevation="sm" padding="lg">
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
                    <p style={{ margin: 0, color: "var(--vital-400)", fontSize: "var(--text-sm)" }}>
                      Password updated.
                    </p>
                  )}

                  <div>
                    <Button variant="primary" type="submit">Save password</Button>
                  </div>
                </div>
              </Form>
            </Card>
          </section>

          {/* PREFERENCES */}
          <section>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>PREFERENCES</div>
            <Card elevation="sm" padding="lg">
              <Switch
                tone="focus"
                size="md"
                checked={darkMode}
                onChange={handleThemeToggle}
                label="Dark mode"
              />
            </Card>
          </section>

          {/* ASSIGNMENTS (owner-only) */}
          {canManageAssignments && (
            <section>
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>ASSIGNMENTS</div>
              <Card elevation="sm" padding="lg">
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                  Assign subjects to practitioners to grant them scoped access (AUTH-03).
                </p>
                <Link to="/settings/assignments">
                  <Button variant="secondary" size="sm">Manage assignments</Button>
                </Link>
              </Card>
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN — invites (the wider 1.6 track) ────────────────── */}
        {canInviteClient ? (
          <InvitesFlow invites={invites} canInvitePractitioner={canInvitePractitioner} />
        ) : (
          <section>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>INVITES</div>
            <Card elevation="sm" padding="lg">
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                Inviting team members isn&apos;t available for your role.
              </p>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
