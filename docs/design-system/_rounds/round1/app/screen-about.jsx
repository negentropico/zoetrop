/* About — written record of the Q1–Q5 resolutions + new components (brief deliverable #2/#3/#5) */
const AD = window.ZoetropDesignSystem_48aebc;

function Swatch({ c, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ width: 56, height: 40, borderRadius: 'var(--radius-sm)', background: c, border: '1px solid var(--border)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
function Decision({ q, title, children }) {
  return (
    <ZCard padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--accent)', border: '1px solid var(--focus-200)', background: 'var(--focus-50)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>{q}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>{title}</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{children}</div>
    </ZCard>
  );
}

function AboutScreen({ path }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Roundtrip notes" title="Redesign decisions" sub="How the shipped Zoetrop screens were re-expressed in the Zoetrop brand — and the open questions resolved along the way." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
        <Decision q="Q1" title="9 categories → 3 families: status drives color">
          The brand ships three metric families; the product has nine clinical categories. Rather than invent nine hues, <strong>color is driven by status</strong> (optimal / borderline / deficient / excess). Categories carry identity through a <strong>Lucide icon in a neutral Ink chip</strong> — no per-category hue. The brand families stay reserved for where they semantically belong (Autonomic → Vital). The result reads as a calm practitioner instrument, not a toy.
        </Decision>

        <Decision q="Q2" title="The four-status palette">
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
            <Swatch c="var(--success)" label="optimal ✓" />
            <Swatch c="var(--warning)" label="borderline ~" />
            <Swatch c="var(--danger)" label="deficient ↓" />
            <Swatch c="var(--excess)" label="excess ↑" />
          </div>
          optimal = Vital teal, borderline = Energy amber, deficient = Danger red. The fourth, <strong>excess, is a deep bronze <code style={{fontFamily:'var(--font-mono)'}}>#c98910</code></strong> — clearly separable from amber. Every status is paired with a glyph (✓ ~ ↓ ↑) and a mono label, so it survives colorblindness.
        </Decision>

        <Decision q="Q3" title="Light-first, dark-ready">
          The light theme is built faithfully on warm Paper. All color is <strong>token-driven</strong> (no hardcoded light-only values in component logic), so a future warm-dark theme (Ink-paper inverted) drops in later without rework.
        </Decision>

        <Decision q="Q4" title="One responsive system, not two layouts">
          A desktop top-bar collapses to a <strong>bottom tab-bar</strong> on mobile (≥44px targets). The Metrics section nav becomes a <strong>horizontal scroll of pills</strong>; multi-column grids reflow to one column; the dense correlations table switches from a scrollable <strong>table</strong> to <strong>card-per-row</strong>. The 393px frame is a responsive endpoint, not a hard target.
        </Decision>

        <Decision q="Q5" title="Wordmark — flagged, not relitigated">
          The header shows the brand form <strong>zoetrop.</strong> with the periwinkle period, alongside a small <em>codename Zoetrop</em> tag. The treatment is neutral and easy to swap when the public brand is settled.
        </Decision>

        <ZCard padding="lg">
          <Eyebrow style={{ marginBottom: 14 }}>New components flagged for the system</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {[
              ['RangeBar', 'Value-against-reference/optimal bar with Ink tick'],
              ['PhaseBar', 'Segmented 4-phase timeline (shared: dashboard, protocol, cessation)'],
              ['TrendChart', 'Brand-tokened line chart — the chart language for Phase 6 reports'],
              ['DataTable', 'Mono header, warm hairlines, tabular cells; card-per-row on mobile'],
              ['Dropzone', 'Periwinkle drag-active upload; ancestor of Phase 5 lab review'],
              ['StatusBadge', 'Status pill with glyph + mono label'],
            ].map(([n, d]) => (
              <div key={n} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{n}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 5 }}>{d}</div>
              </div>
            ))}
          </div>
        </ZCard>

        <ZCard padding="lg">
          <Eyebrow style={{ marginBottom: 12 }}>Substitution flags</Eyebrow>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
            Fonts (Space Grotesk / Hanken Grotesk / Space Mono) are Google-Fonts stand-ins for the licensed geometric grotesque. Icons are <strong>Lucide</strong>. Clinical reference ranges shown on the range bars are sensible placeholders chosen to match each value's captured status — swap for the real assay ranges in code.
          </p>
        </ZCard>
      </div>
    </AppShell>
  );
}
window.AboutScreen = AboutScreen;
