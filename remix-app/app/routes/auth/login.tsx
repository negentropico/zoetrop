import { redirect, useActionData, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontSize: "var(--text-base)",
  fontFamily: "var(--font-text)",
  boxSizing: "border-box",
};

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </div>
  );
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get("inviteToken");
  const role = searchParams.get("role");
  const isInvite = !!inviteToken;
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gap-2xl)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "var(--gap-2xl)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--gap-xl)", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "var(--text-2xl)",
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            Zoetrop
          </div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {isInvite ? "Create your account" : "Sign in to continue"}
          </p>
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
              background: "var(--danger-50, #fff0f0)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--gap-md)",
            }}
          >
            {actionData.error}
          </div>
        )}

        {/* Form */}
        <form method="post">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--gap-md)",
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
                />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="new-password"
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
                />
                <Field
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                />
              </>
            )}

            <button
              type="submit"
              style={{
                display: "block",
                width: "100%",
                padding: "11px 0",
                borderRadius: "var(--radius-md)",
                background: "var(--ink)",
                color: "var(--n-50)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--text-base)",
                letterSpacing: "-0.01em",
                border: "none",
                cursor: "pointer",
                marginTop: "var(--gap-sm)",
              }}
            >
              {isInvite ? "Create account" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
