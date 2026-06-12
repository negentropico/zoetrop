// DisclaimerCallout — K4 speculative recommendation warning callout.
// Zero props — the disclaimer string is locked by ROADMAP SC5 and hard-coded here.
// DO NOT add a prop to override the string. corpus-lint.test.ts asserts verbatim presence.
// UI-SPEC Pattern 3 (Phase 6).

import { AlertTriangle } from "lucide-react";

// LOCKED string — ROADMAP SC5. corpus-lint.test.ts asserts this exact text is present.
const K4_DISCLAIMER =
  "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting.";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DisclaimerCalloutProps {}

export function DisclaimerCallout({}: DisclaimerCalloutProps) {
  return (
    <div
      role="note"
      aria-label="K4 speculative recommendation notice"
      style={{
        background: "var(--excess-bg)",
        borderLeft: "3px solid var(--energy)",
        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
        padding: "12px 16px",
        marginTop: 12,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <AlertTriangle
        size={16}
        aria-hidden="true"
        style={{ color: "var(--energy-600)", flexShrink: 0, marginTop: 1 }}
      />
      <span
        style={{
          color: "var(--text-secondary)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.5,
        }}
      >
        {K4_DISCLAIMER}
      </span>
    </div>
  );
}
