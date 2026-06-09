// Browser-safe auth client — NO .server.ts suffix.
// This file is imported by login/logout components that run in the browser.
// Must NOT import from any server-only module (no secrets, no Pool, no schema).
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // SSR-safe baseURL: window is undefined on the server, empty string falls back
  // to the current origin (relative URLs work for all Better-Auth API calls).
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});
