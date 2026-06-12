/**
 * index.tsx — /import → /ingest redirect (round-3 IA, design-r35/W3)
 *
 * Import + Ingest merged into one nav section: the old Import overview was a
 * pure link hub, replaced by the combined Ingest overview (Sources list +
 * Review gate). /import/whoop and /import/vault keep their routes as aliases
 * under the Ingest nav group — only this overview moved.
 */

import { redirect } from "react-router";

export function loader() {
  return redirect("/ingest");
}

// Default export is required by React Router even when the loader always
// redirects — this component is never rendered in normal flow.
export default function ImportIndex() {
  return null;
}
