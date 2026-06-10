import { redirect, useActionData, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

// Redirect already-authenticated users away from the login page.
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) throw redirect("/dashboard");
  return null;
}

// Sign-in action — forward Set-Cookie from Better-Auth's response (A6).
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
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
    return { error: "Invalid credentials" };
  }
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
    return { error: "Invalid credentials" };
  }

  // Forward the Set-Cookie header from Better-Auth's response.
  throw redirect(redirectTo, { headers: response.headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
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
            Sign in to continue
          </p>
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
          <input type="hidden" name="redirect" value={redirectTo} />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)" }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                style={{
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
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={{
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
                }}
              />
            </div>

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
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
