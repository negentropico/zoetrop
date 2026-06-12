import { Link, redirect, useActionData, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { SpiralMark } from "~/components/ui/SpiralMark";

// Redirect already-authenticated users away from the login / invite-redeem page.
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) throw redirect("/dashboard");
  return null;
}

// Single action serving two intents:
//   - "signin"  → existing email/password sign-in
//   - "signup"  → invite redemption: create the account, with role + tenant
//                 assigned server-side by the beforeSignUp hook from the invite
//                 row (NEVER from user input — the ?role param is display-only).
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const email = formData.get("email");
  const password = formData.get("password");

  // WR-04: reject absent/non-string fields (a crafted POST bypasses the
  // client-side `required`) before calling Better-Auth.
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return {
      error: "Invalid credentials.",
      mode: intent === "signup" ? "signup" : "signin",
    } as const;
  }

  // ── Invite redemption (sign-up) ──────────────────────────────────────────────
  if (intent === "signup") {
    const name = formData.get("name");
    const inviteToken = formData.get("inviteToken");

    if (typeof name !== "string" || !name.trim()) {
      return { error: "Please enter your name.", mode: "signup" } as const;
    }
    if (typeof inviteToken !== "string" || !inviteToken) {
      return {
        error:
          "This invite link is missing its token. Ask your inviter for a fresh link.",
        mode: "signup",
      } as const;
    }
    if (password.length < 8) {
      return {
        error: "Password must be at least 8 characters.",
        mode: "signup",
      } as const;
    }

    // signUpEmail triggers the beforeSignUp hook, which resolves the hashed
    // token, consumes the invite (single-use, race-safe), and injects the
    // invite's role + tenantId. The signUpEmail body type narrows to known
    // fields; the hook reads `inviteToken` off ctx.body at runtime, so we cast
    // it on without losing type safety on the rest.
    let response: Response;
    try {
      response = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name.trim(),
          ...({ inviteToken } as Record<string, unknown>),
        },
        asResponse: true,
      });
    } catch {
      // beforeSignUp throws FORBIDDEN ("signup_disabled") for invalid / expired /
      // consumed / revoked invites (fail-closed).
      return {
        error:
          "This invite is invalid, expired, or has already been used. Ask your inviter for a new link.",
        mode: "signup",
      } as const;
    }

    if (!response.ok) {
      return {
        error:
          "We couldn't create your account. The invite may be invalid or used, or that email may already be registered.",
        mode: "signup",
      } as const;
    }

    // Better-Auth auto-signs-in on sign-up (default) — forward its Set-Cookie.
    throw redirect("/dashboard", { headers: response.headers });
  }

  // ── Sign-in (default) ────────────────────────────────────────────────────────
  // WR-05: only honor same-origin local paths to prevent an open redirect
  // (e.g. ?redirect=https://evil/ or //evil/) post-authentication.
  const rawRedirect = formData.get("redirect");
  const redirectTo =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  if (!response.ok) {
    return { error: "Invalid credentials.", mode: "signin" } as const;
  }

  // Forward the Set-Cookie header from Better-Auth's response.
  throw redirect(redirectTo, { headers: response.headers });
}

// Display-only mapping for the ?role hint on an invite link. The actual role is
// assigned server-side from the invite row — this is purely cosmetic.
const ROLE_LABELS: Record<string, string> = {
  owner: "an Owner",
  practitioner: "a Practitioner",
  client: "a Client",
};

// design-r35/W5: the field is the W0 `zt-field` idiom — mono eyebrow label
// over an input with an accent focus border. Name/type/autoComplete and the
// real `name` attribute (consumed by the action) are unchanged; only markup
// and classes are restyled. `required` preserved (client-side gate; the
// action re-validates server-side per WR-04).
function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
}) {
  return (
    <label className="zt-field" htmlFor={id}>
      <span className="zt-eyebrow">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get("inviteToken");
  const role = searchParams.get("role");
  const isInvite = !!inviteToken;
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  // design-r35/W5: centered frame card on the dot-grain paper, restyled from
  // screens-public.jsx. Public surface — no AppShell (login lives outside the
  // _app layout per routes.ts). The form's method/action/field-names/hidden
  // inputs are PRESERVED verbatim; only the markup + classes changed.
  // COPY note: the eyebrow + invite note are placeholder/design copy (owner
  // marketing copy outstanding, logged in round3/deferred-items.md).
  return (
    <div
      className="zt-public"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Public topbar (no Sign-in CTA on the login page itself) */}
      <header className="zt-pub-top">
        <Link
          to="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
        >
          <SpiralMark size={24} />
          <span className="zn-wordmark">
            zoetrop<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--gap-2xl) var(--gap-xl)",
        }}
      >
        <div
          className="zt-frame bg-surface rounded-xl border border-border shadow-lg"
          style={{
            width: "100%",
            maxWidth: 384,
            padding: "var(--gap-2xl)",
            boxSizing: "border-box",
          }}
        >
          {/* Header — spiral mark, mono eyebrow, display sub */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              marginBottom: "var(--gap-2xl)",
            }}
          >
            <SpiralMark size={36} />
            <div
              className="zt-eyebrow"
              style={{ marginTop: "var(--gap-lg)" }}
            >
              {isInvite ? "Create your account" : "Owner access"}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                margin: "6px 0 0",
                color: "var(--ink)",
              }}
            >
              {isInvite ? "Join the sequence" : "Back to the sequence"}
            </h1>
            {isInvite && role && ROLE_LABELS[role] && (
              <p
                style={{
                  fontFamily: "var(--font-text)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                You&rsquo;ve been invited as {ROLE_LABELS[role]}.
              </p>
            )}
          </div>

          {/* Error */}
          {actionData?.error && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--danger-bg, var(--deficient-bg))",
                border: "1px solid var(--danger, var(--deficient))",
                color: "var(--danger, var(--deficient))",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--gap-lg)",
              }}
            >
              {actionData.error}
            </div>
          )}

          {/* Form — method/action/field names preserved verbatim */}
          <form
            method="post"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--gap-lg)",
            }}
          >
            {isInvite ? (
              <>
                <input type="hidden" name="intent" value="signup" />
                <input type="hidden" name="inviteToken" value={inviteToken} />
                <Field
                  id="name"
                  name="name"
                  type="text"
                  label="Name"
                  autoComplete="name"
                  placeholder="Your name"
                />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  placeholder="owner@example.com"
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                />
              </>
            ) : (
              <>
                <input type="hidden" name="intent" value="signin" />
                <input type="hidden" name="redirect" value={redirectTo} />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  placeholder="owner@example.com"
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                />
              </>
            )}

            <button
              type="submit"
              className="zt-btn-ink"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              {isInvite ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* Quiet invite note (placeholder/design copy) */}
          <p
            style={{
              margin: "var(--gap-xl) 0 0",
              textAlign: "center",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textWrap: "pretty",
            }}
          >
            Single-owner instrument. New viewers join by invite from Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
