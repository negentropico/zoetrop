// AppShell: root layout wrapper providing TopNav + <main> + footer + BottomTab.
// Wraps all 16 routes via root.tsx App export.
// Source: docs/design-system/_rounds/round1/app/lib.jsx AppShell (lines 421–438)
import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { BottomTab } from "./BottomTab";
import { SpiralMark } from "../ui/SpiralMark";

interface AppShellProps {
  children: ReactNode;
  wide?: boolean; // max-width 1280 (Insights, Import) vs 1180 default
  user: { name: string; email: string; role: string };
}

export function AppShell({ children, wide = false, user }: AppShellProps) {
  const maxW = wide ? 1280 : 1180;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopNav user={user} />
      <main
        style={{
          maxWidth: maxW,
          margin: "0 auto",
          padding: "var(--gap-3xl) var(--gap-2xl)",
        }}
      >
        {children}
      </main>
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 24,
        }}
      >
        <div
          style={{
            maxWidth: maxW,
            margin: "0 auto",
            padding: "22px var(--gap-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            className="zt-eyebrow inline-flex items-center gap-2.5"
            style={{ gap: 10 }}
          >
            <SpiralMark size={16} color="var(--text-faint)" />
            zoetrope
          </span>
        </div>
      </footer>
      <BottomTab />
      {/* Bottom padding spacer on mobile — prevents content from hiding under BottomTab */}
      <div className="md:hidden" style={{ height: 80 }} />
    </div>
  );
}
