/* ============================================================
   Zoetrop — round 5 sample-data extensions (design artifact
   only — do not integrate). Extends window.ZD in place.
   Loaded after data-r4.js.

   WHOOP + Vault are TRUSTED SOURCES (owner pick, round 5):
   their writes land directly — no review gate. Only lab PDFs
   pass through extraction review.
   ============================================================ */
(function () {
  var ZD = window.ZD;

  /* --- WHOOP connected/imported state ------------------------
     fields map into the real metric catalog (autonomic);
     tdee is intentionally unmapped — the mapping language has
     to show what "skipped" looks like. ----------------------- */
  ZD.whoop = {
    connected: true,
    file: 'whoop_analysis_report.json',
    imported: 'Jun 10, 2026',
    lastRecord: 'Jun 9, 2026',
    rangeStart: 'May 12, 2025',
    records: 394,
    fields: [
      { key: 'hrv_rmssd',         catId: 'autonomic', metricId: 'hrv',      points: 394, last: 68,   unit: 'ms' },
      { key: 'recovery_score',    catId: 'autonomic', metricId: 'recovery', points: 394, last: 78,   unit: '%' },
      { key: 'rhr',               catId: 'autonomic', metricId: 'rhr',      points: 394, last: 54,   unit: 'bpm' },
      { key: 'sleep_performance', catId: 'autonomic', metricId: 'sleep',    points: 389, last: 82,   unit: '%' },
      { key: 'tdee',              catId: null,        metricId: null,       points: 394, last: 2841, unit: 'kcal' },
    ],
    /* last five daily records, as parsed from the export */
    sample: [
      { date: 'Jun 5', hrv: 71, recovery: 81, rhr: 53, sleep: 88, tdee: 2790 },
      { date: 'Jun 6', hrv: 66, recovery: 74, rhr: 55, sleep: 79, tdee: 2912 },
      { date: 'Jun 7', hrv: 69, recovery: 77, rhr: 54, sleep: 84, tdee: 2705 },
      { date: 'Jun 8', hrv: 73, recovery: 83, rhr: 52, sleep: 90, tdee: 2860 },
      { date: 'Jun 9', hrv: 68, recovery: 78, rhr: 54, sleep: 82, tdee: 2841 },
    ],
  };

  /* --- Obsidian vault connected state ------------------------ */
  ZD.vault = {
    connected: true,
    path: '~/Obsidian/health',
    lastSync: 'Jun 11 · 22:04',
    schedule: 'nightly',
    notes: 38,
    recentNotes: [
      { file: 'protocol/p4-phasing-notes.md', kind: 'protocol note', synced: 'Jun 11' },
      { file: 'protocol/sleep-winddown.md',   kind: 'protocol note', synced: 'Jun 11' },
      { file: 'targets/vitamin-d.md',         kind: 'target',        synced: 'Jun 9'  },
      { file: 'targets/apob.md',              kind: 'target',        synced: 'Jun 9'  },
      { file: 'journal/2026-06-08.md',        kind: 'protocol note', synced: 'Jun 8'  },
    ],
    /* metric targets lifted from vault target notes — owner
       targets, allowed to differ from the optimal band */
    targets: [
      { metric: 'Vitamin D (25-OH)', catId: 'vitamins',  metricId: 'vitd',     target: '60–80 ng/mL'   },
      { metric: 'ApoB',              catId: 'lipids',    metricId: 'apob',     target: '< 80 mg/dL'    },
      { metric: 'HRV (rMSSD)',       catId: 'autonomic', metricId: 'hrv',      target: '> 65 ms'       },
      { metric: 'Ferritin',          catId: 'minerals',  metricId: 'ferritin', target: '50–150 ng/mL'  },
      { metric: 'hs-CRP',            catId: 'inflammatory', metricId: 'hsCRP', target: '< 1.0 mg/L'    },
      { metric: 'HbA1c',             catId: 'metabolic', metricId: 'a1c',      target: '≤ 5.4 %'       },
    ],
  };

  /* --- settings: invites -------------------------------------
     Two roles (owner pick, round 5): viewer + clinician.
     Mutated in place by the Settings screen (in-memory,
     design artifact — back with the real invites API). ------- */
  ZD.inviteRoles = [
    { id: 'viewer',    label: 'Viewer',    desc: 'Dashboards and trends' },
    { id: 'clinician', label: 'Clinician', desc: 'Adds lab documents and protocol detail' },
  ];
  ZD.invites = [
    { id: 'inv-01', email: 'dr.reyes@northlake-clinic.com', role: 'clinician', status: 'accepted', sent: 'May 2'  },
    { id: 'inv-02', email: 'sam.winters@example.com',       role: 'viewer',    status: 'pending',  sent: 'Jun 8'  },
  ];
})();
