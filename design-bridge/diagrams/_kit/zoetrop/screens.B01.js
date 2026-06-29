/* =========================================================================
   B01 SYSTEM & SURFACES — data-only manifest (the SSOT for all three tiers).
   Sets window.ZOETROP_B01; AppScreen.jsx (FlowBoard) reads it and renders the
   six-stage periwinkle-spine map at lo-fi / hi-fi / full from this ONE source.
   Change a value here and all three boards change. Loaded as a classic <script>
   in each board's <head> (before the runtime boots React). Synthetic demo
   subject "Jordan Vale" — no PHI.

   Frame schema (per lane.frames[i]):
     surface  — sidebar active id: clients|dashboard|metrics|protocol|insights|reports|ingest
     cap      — lo-fi caption
     u        — hi-fi mini-screen top-bar URL (carried from the old hi-fi board)
     eye, h   — page eyebrow + title (hi-fi/full PageHeader)
     sub?, act?, actgn?, foc?, term?
     content  — { type, …payload }   (was { type, d:{…} } in the old full board)
   ========================================================================= */
(function () {
  var SPARK1 = '<svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="2,32 22,28 42,30 62,18 82,13 98,8" fill="none" stroke="var(--p)" stroke-width="2.5"/></svg>';
  var SPARKV = '<svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="2,30 22,26 42,27 62,19 82,16 98,11" fill="none" stroke="var(--vital-400)" stroke-width="2.5"/></svg>';
  var SCATTER = '<svg viewBox="0 0 100 40"><line x1="6" y1="34" x2="94" y2="7" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="16" cy="31" r="2.6" fill="var(--vital-400)"/><circle cx="34" cy="25" r="2.6" fill="var(--vital-400)"/><circle cx="52" cy="22" r="2.6" fill="var(--p)"/><circle cx="70" cy="14" r="2.6" fill="var(--p)"/><circle cx="86" cy="10" r="2.6" fill="var(--p)"/></svg>';

  window.ZOETROP_B01 = {
    meta: {
      subject: "Jordan Vale",
      scenario: "Practitioner onboards a client · diagnostics → graded protocol → report",
      stages: ["Onboard", "Ingest", "Analyze", "Protocol", "Report", "Sustain"],
    },
    lanes: [
      /* ── Stage 1 · Onboard ─────────────────────────────────────────────── */
      {
        stage: "Stage 1", name: "Onboard", path: "/clients",
        sticky: ["sys", "◇ back-stage", "Client record + <b>tenancy &amp; identity</b> provisioned; invite link issued."],
        frames: [
          { surface: "clients", cap: "New client", u: "/clients/new", eye: "Clients", h: "New client", act: "Create",
            content: { type: "form", fields: [["Name", "Jordan Vale"], ["Email", "jordan@…", 1], ["Practice", "HIGHER"]] } },
          { surface: "clients", cap: "Consent", u: "/clients/consent", eye: "Consent", h: "Data sharing", act: "Agree",
            content: { type: "opts", opts: [["Share lab results", "retroactive + ongoing", 1], ["Share WHOOP", "HRV · recovery · sleep", 1]] } },
          { surface: "clients", cap: "Baseline · goals", u: "/clients/baseline", eye: "Baseline", h: "Goals & history", act: "Save",
            content: { type: "form", fields: [["Primary goal", "Recomposition"], ["Age / sex", "38 · M"], ["History", "Cessation — day 41"]] } },
        ],
      },
      /* ── Stage 2 · Ingest ──────────────────────────────────────────────── */
      {
        stage: "Stage 2", name: "Ingest", path: "/ingest",
        sticky: ["sys", "◇ back-stage", "Lab PDF <b>parsed → normalized</b> into the metrics table; WHOOP JSON → HRV/recovery/RHR/sleep series."],
        frames: [
          { surface: "ingest", cap: "Ingest overview", u: "/ingest", eye: "Ingest", h: "Sources", sub: "3 connected",
            content: { type: "tiles", tiles: [["Lab PDFs", "2 pending", ""], ["WHOOP", "synced", "v"], ["Vault", "12 notes", "e"]] } },
          { surface: "ingest", cap: "Lab PDFs", u: "/ingest/upload", eye: "Lab PDFs", h: "Upload", act: "Upload",
            content: { type: "hero", t: "Drop a lab PDF", s: "Quest · LabCorp · Function", cta: "Choose file" } },
          { surface: "ingest", cap: "WHOOP", u: "/import/whoop", eye: "WHOOP", h: "Autonomic",
            content: { type: "ring", v: 62, stats: [["62", "HRV ms"], ["48", "RHR bpm"], ["91%", "Sleep"]] } },
          { surface: "ingest", cap: "Vault", u: "/import/vault", eye: "Vault", h: "Obsidian notes",
            content: { type: "docs", docs: [["05_Physiological_Metrics", "md"], ["08_Cessation_Protocol", "md"], ["09_Targets_2026", "md"]] } },
          { surface: "ingest", cap: "Review · gate", u: "/ingest/review", eye: "Review · gate", h: "Verify import", act: "Approve", foc: 1,
            content: { type: "gate", ok: "12 markers parsed · 0 conflicts", note: "Confirm units & ranges before they reach the metrics table." } },
        ],
      },
      /* ── Stage 3 · Analyze ─────────────────────────────────────────────── */
      {
        stage: "Stage 3", name: "Analyze", path: "the engine",
        sticky: ["sys", "◆ the moat", "The <b>confidence-graded engine</b> grades each marker <b>K1–K4</b> — honest uncertainty, not faked certainty."],
        frames: [
          { surface: "metrics", cap: "Metrics", u: "/metrics", eye: "Metrics", h: "All categories", sub: "9 panels",
            content: { type: "table", rows: [["Lipids", "8 markers", "borderline", "K2"], ["Metabolic", "optimal", "optimal", "K1"], ["Hormones", "review", "deficient", "K3"]] } },
          { surface: "metrics", cap: "Category · Lipids", u: "/metrics/lipids", eye: "Lipids", h: "Lipid panel", sub: "8 markers",
            content: { type: "table", rows: [["LDL-C", "98 mg/dL", "borderline", "K2"], ["HDL-C", "61 mg/dL", "optimal", "K1"], ["ApoB", "82 mg/dL", "optimal", "K2"], ["Lp(a)", "44 nmol/L", "deficient", "K3"]] } },
          { surface: "metrics", cap: "Metric detail", u: "/metrics/lipids/ldl", eye: "LDL-C", h: "Marker detail", act: "History",
            content: { type: "trend", svg: SPARK1, stats: [["98", "mg/dL"], ["−18%", "6 mo"], ["K2", "grade"]] } },
          { surface: "insights", cap: "Correlations", u: "/insights/correlations", eye: "Correlations", h: "HRV × LDL", sub: "r = −0.61",
            content: { type: "trend", svg: SCATTER, stats: [["−0.61", "Pearson r"], ["18", "points"]] } },
          { surface: "insights", cap: "Genetics", u: "/insights/genetics", eye: "Genetics", h: "Variants",
            content: { type: "table", rows: [["APOE", "ε3/ε4", "excess", "K2"], ["MTHFR", "C677T", "borderline", "K2"], ["FAAH", "C385A", "optimal", "K3"]] } },
        ],
      },
      /* ── Stage 4 · Protocol ────────────────────────────────────────────── */
      {
        stage: "Stage 4", name: "Protocol", path: "/protocol",
        sticky: ["warn", "◷ decision", "The <b>protocol-decision engine</b> proposes adjustments from graded evidence; the practitioner commits a new version."],
        frames: [
          { surface: "protocol", cap: "Protocol overview", u: "/protocol", eye: "Protocol", h: "P6 · current", sub: "adherence 88%",
            content: { type: "overview", cards: [["Adherence", "88%", "30-day"], ["Phase", "3 of 4", "Clearing"], ["Tiers", "12", "active"]] } },
          { surface: "protocol", cap: "Versions", u: "/protocol/versions", eye: "Versions", h: "Version history",
            content: { type: "opts", opts: [["P6 · 2026-06", "current — graded recut", 1], ["P5 · 2026-03", "prior baseline"], ["P4 · 2025-12", "pre-cessation"]] } },
          { surface: "protocol", cap: "Supplements · tiers", u: "/protocol/supplements", eye: "Supplements", h: "Tiers",
            content: { type: "tiles", tiles: [["Tier 1", "core · 5", ""], ["Tier 2", "support · 4", "v"], ["Tier 3", "trial · 3", "e"]] } },
          { surface: "protocol", cap: "Phasing", u: "/protocol/cessation", eye: "Phasing", h: "FAAH cessation", act: "Day 41",
            content: { type: "hero", t: "120-day arc", s: "Acute → Stabilization → Clearing → Optimization", cta: "Phase 3 · Clearing" } },
          { surface: "protocol", cap: "Compare · decide", u: "/protocol/compare", eye: "Compare · decide", h: "P5 → P6", act: "Commit", foc: 1,
            content: { type: "compare", cols: [[["Omega-3 2g", ""], ["NMN 500mg", ""], ["—", ""]], [["Omega-3 3g", "Δ"], ["NMN 500mg", ""], ["+ Berberine", "+"]]] } },
        ],
      },
      /* ── Stage 5 · Report (terminal stage band) ────────────────────────── */
      {
        stage: "Stage 5", name: "Report", path: "/reports", term: 1,
        sticky: ["sys", "◇ back-stage", "Report assembles <b>graded findings + protocol</b> into a client-ready document (PDF / shareable)."],
        frames: [
          { surface: "reports", cap: "All reports", u: "/reports", eye: "Reports", h: "All reports", sub: "3",
            content: { type: "docs", docs: [["2026-06 · Quarterly review", "PDF"], ["2026-03 · Quarterly review", "PDF"], ["2025-12 · Baseline", "PDF"]] } },
          { surface: "reports", cap: "Generate", u: "/reports/generate", eye: "Generate", h: "Assemble report", act: "Build",
            content: { type: "hero", t: "Quarterly review", s: "Graded findings + P6 protocol + trends", cta: "Generate" } },
          { surface: "reports", cap: "Deliver", u: "/reports/r-0626", eye: "Deliver", h: "Client-ready", act: "Send", actgn: 1, term: 1,
            content: { type: "gate", ok: "Report ready · 14 pages", note: "Share a secure link or export the PDF for the client." } },
        ],
      },
      /* ── Stage 6 · Sustain (loops back to Ingest) ──────────────────────── */
      {
        stage: "Stage 6", name: "Sustain", path: "/dashboard",
        sticky: ["warn", "↻ the loop", "New labs &amp; WHOOP re-enter <b>Stage 2 · Ingest</b> — the instrument is continuous, not one-shot."],
        frames: [
          { surface: "dashboard", cap: "Dashboard", u: "/dashboard", eye: "Dashboard", h: "Today", sub: "day 41",
            content: { type: "ring", v: 78, stats: [["78", "Recovery"], ["7:42", "Sleep"], ["P6", "Protocol"]] } },
          { surface: "metrics", cap: "Metrics · ongoing", u: "/metrics", eye: "Trends", h: "Ongoing", sub: "last 90d",
            content: { type: "trend", svg: SPARKV, stats: [["+12%", "HRV"], ["−18%", "LDL"], ["88%", "Adherence"]] } },
        ],
      },
    ],
  };
})();
