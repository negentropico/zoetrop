import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { useLayoutEffect } from "react";
import "./app.css";

// Replace Inter with the three Zoetrop brand fonts (D-11).
// Weights: Space Grotesk 400/500/600/700 + Hanken Grotesk 300–800 + Space Mono 400/700.
// Do NOT also import tokens/fonts.css in app.css — that would load fonts twice.
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap",
  },
];

// No-flash theme script (static literal — T-04.1-02: no interpolation of any
// user/runtime value, reads only its own localStorage + matchMedia, writes only
// data-theme; XSS-safe by construction).
const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('zt-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

// ThemeRestorer: re-applies data-theme after React's commit phase on ALL routes.
//
// React 19's singleton acquisition (commitHostSingletonAcquisition) strips ALL
// attributes from <html> during StrictMode's double-invocation "reappear" cycle
// and during Suspense boundary transitions. This clears data-theme set by the
// no-flash script, making the page appear light even when dark is persisted.
//
// useLayoutEffect fires synchronously after the commit phase (before paint),
// so it re-applies data-theme before the user sees anything. This fixes:
//   1. All routes showing the wrong theme post-hydration (login vs dashboard).
//   2. ThemeToggle needing two clicks (state diverged from DOM after strip).
//
// The ThemeToggle component has its own useLayoutEffect for the same reason —
// this one covers routes that don't mount ThemeToggle (e.g. /login, /landing).
function ThemeRestorer() {
  useLayoutEffect(() => {
    // Re-read from localStorage (the canonical source) and re-apply.
    // Mirrors the no-flash script logic exactly.
    let theme: string;
    try {
      const stored = localStorage.getItem("zt-theme");
      if (stored === "dark" || stored === "light") {
        theme = stored;
      } else {
        theme =
          window.matchMedia?.("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      }
    } catch {
      theme = "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, []);
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline no-flash script sets data-theme on
    // <html> before paint. The server renders without data-theme; React would
    // warn about the mismatch. suppressHydrationWarning silences it (one level).
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* No-flash script BEFORE <Meta /> / <Links /> — must run before any CSS loads */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body className="bg-paper text-ink min-h-screen font-text">
        <ThemeRestorer />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// App renders a bare Outlet — AppShell lives in routes/_app/layout.tsx
// so only authenticated routes get the shell (Pitfall 3 / D-05).
export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
