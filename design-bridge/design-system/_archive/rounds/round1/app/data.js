/* ============================================================
   Zoetrop — redesign dataset (M0 static data from the screens)
   Every number here is carried verbatim from the captured screens.
   Ranges (ref/opt) are sensible clinical bands chosen so each
   value lands in its captured status zone.
   ============================================================ */
(function () {
  // spark: short recent series for row sparklines / detail history
  function spark(v, n, jitter) {
    n = n || 5; jitter = jitter == null ? 0.12 : jitter;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const wobble = Math.sin(i * 1.7) * jitter + (t - 0.5) * jitter * 0.6;
      out.push(+(v * (1 + wobble)).toFixed(2));
    }
    out[n - 1] = v;
    return out;
  }

  const cats = [
    { id: 'vitamins', name: 'Vitamins', icon: 'pill', desc: 'B-vitamins and fat-soluble vitamins', family: null, metrics: [
      { name: 'Biotin', value: 7.8, unit: 'ng/mL', status: 'excess', min: 0, max: 10, ref: [1, 8], opt: [2, 6], dir: 'target' },
      { name: 'Folate', value: 16.2, unit: 'ng/mL', status: 'optimal', min: 0, max: 30, ref: [3, 20], opt: [10, 24], dir: 'higher' },
      { name: 'Vitamin B12', value: 678, unit: 'pg/mL', status: 'optimal', min: 0, max: 1500, ref: [200, 1100], opt: [500, 900], dir: 'higher' },
      { name: 'Vitamin B6 (P5P)', value: 102.9, unit: 'µg/L', status: 'excess', min: 0, max: 140, ref: [5, 110], opt: [10, 60], dir: 'target' },
      { name: 'Vitamin D', value: 48.4, unit: 'ng/mL', status: 'optimal', min: 0, max: 120, ref: [30, 100], opt: [40, 70], dir: 'higher' },
    ] },
    { id: 'minerals', name: 'Minerals', icon: 'gem', desc: 'Essential and trace minerals', family: null, metrics: [
      { name: 'Copper', value: 104, unit: 'µg/dL', status: 'optimal', min: 50, max: 170, ref: [70, 140], opt: [85, 125], dir: 'target' },
      { name: 'Magnesium (RBC)', value: 6.7, unit: 'mg/dL', status: 'borderline', min: 3, max: 8, ref: [4.2, 6.8], opt: [5.5, 6.5], dir: 'higher' },
      { name: 'Zinc', value: 89, unit: 'µg/dL', status: 'optimal', min: 40, max: 150, ref: [60, 120], opt: [80, 110], dir: 'target' },
    ] },
    { id: 'inflammatory', name: 'Inflammatory', icon: 'flame', desc: 'Inflammation markers', family: null, metrics: [
      { name: 'Homocysteine', value: 9.4, unit: 'µmol/L', status: 'borderline', min: 0, max: 20, ref: [0, 15], opt: [0, 7], dir: 'lower' },
    ] },
    { id: 'metabolic', name: 'Metabolic', icon: 'zap', desc: 'Glucose, kidney, electrolytes', family: null, metrics: [
      { name: 'BUN', value: 20, unit: 'mg/dL', status: 'borderline', min: 0, max: 30, ref: [7, 20], opt: [10, 18], dir: 'target' },
      { name: 'Creatinine', value: 1.2, unit: 'mg/dL', status: 'borderline', min: 0.4, max: 1.6, ref: [0.7, 1.3], opt: [0.8, 1.1], dir: 'target' },
      { name: 'eGFR', value: 78, unit: 'mL/min', status: 'borderline', min: 0, max: 140, ref: [60, 120], opt: [90, 120], dir: 'higher' },
      { name: 'Fasting Insulin', value: 5.7, unit: 'µIU/mL', status: 'optimal', min: 0, max: 25, ref: [2, 20], opt: [2, 8], dir: 'lower' },
      { name: 'Glucose', value: 82, unit: 'mg/dL', status: 'optimal', min: 50, max: 130, ref: [70, 99], opt: [75, 90], dir: 'target' },
      { name: 'HbA1c', value: 5.2, unit: '%', status: 'optimal', min: 3, max: 7, ref: [4, 5.6], opt: [4.5, 5.4], dir: 'lower' },
    ] },
    { id: 'hormones', name: 'Hormones', icon: 'flask-conical', desc: 'Sex, thyroid, cortisol', family: null, metrics: [
      { name: 'Cortisol (AM)', value: 9.1, unit: 'µg/dL', status: 'borderline', min: 0, max: 30, ref: [5, 23], opt: [10, 18], dir: 'target' },
      { name: 'DHEA-S', value: 256, unit: 'µg/dL', status: 'optimal', min: 0, max: 500, ref: [100, 400], opt: [200, 350], dir: 'higher' },
      { name: 'Free T3', value: 3.4, unit: 'pg/mL', status: 'optimal', min: 1, max: 5, ref: [2.3, 4.2], opt: [3.0, 4.0], dir: 'higher' },
      { name: 'Free T4', value: 1.3, unit: 'ng/dL', status: 'optimal', min: 0.5, max: 2.2, ref: [0.8, 1.8], opt: [1.0, 1.5], dir: 'target' },
      { name: 'Total Testosterone', value: 470, unit: 'ng/dL', status: 'borderline', min: 100, max: 1200, ref: [300, 1000], opt: [500, 900], dir: 'higher' },
      { name: 'TSH', value: 2.3, unit: 'µIU/mL', status: 'optimal', min: 0, max: 6, ref: [0.4, 4.5], opt: [1.0, 2.5], dir: 'target' },
    ] },
    { id: 'autonomic', name: 'Autonomic', icon: 'heart-pulse', desc: 'HRV, recovery, sleep (WHOOP)', family: 'vital', metrics: [
      { name: 'HRV (RMSSD)', value: 33.7, unit: 'ms', status: 'borderline', min: 20, max: 100, ref: [30, 85], opt: [45, 70], dir: 'higher', src: 'WHOOP',
        updated: 'January 15, 2026 at 5:00 AM',
        history: [ { date: 'Jan 15, 2026', value: 33.7 }, { date: 'Sep 4, 2025', value: 43.0 }, { date: 'May 1, 2025', value: 29.2 }, { date: 'Feb 6, 2025', value: 32.4 } ],
        targets: { q1: 45, q2: 48, dir: 'Higher is better' } },
      { name: 'Recovery Score', value: 58.6, unit: '%', status: 'borderline', min: 0, max: 100, ref: [33, 100], opt: [67, 100], dir: 'higher', src: 'WHOOP' },
      { name: 'Resting Heart Rate', value: 55, unit: 'BPM', status: 'optimal', min: 35, max: 90, ref: [40, 70], opt: [45, 60], dir: 'lower', src: 'WHOOP' },
      { name: 'Sleep Duration', value: 7.2, unit: 'hrs', status: 'optimal', min: 4, max: 10, ref: [6, 9], opt: [7, 8.5], dir: 'higher', src: 'WHOOP' },
    ] },
    { id: 'body-composition', name: 'Body Composition', icon: 'dumbbell', desc: 'DEXA, lean mass, body fat', family: 'energy', metrics: [
      { name: 'Body Fat', value: 22.5, unit: '%', status: 'borderline', min: 5, max: 35, ref: [10, 28], opt: [12, 18], dir: 'lower', src: 'DEXA' },
      { name: 'Lean Mass', value: 161.8, unit: 'lbs', status: 'optimal', min: 100, max: 220, ref: [120, 200], opt: [150, 190], dir: 'higher', src: 'DEXA' },
      { name: 'Visceral Fat (VAT)', value: 702, unit: 'g', status: 'borderline', min: 0, max: 1500, ref: [0, 1000], opt: [0, 500], dir: 'lower', src: 'DEXA' },
      { name: 'Weight', value: 208.7, unit: 'lbs', status: 'optimal', min: 140, max: 250, ref: [150, 230], opt: [180, 210], dir: 'target' },
    ] },
    { id: 'lipids', name: 'Lipids', icon: 'droplet', desc: 'Cholesterol, triglycerides', family: null, metrics: [
      { name: 'HDL-C', value: 43, unit: 'mg/dL', status: 'borderline', min: 20, max: 100, ref: [40, 90], opt: [55, 90], dir: 'higher' },
      { name: 'LDL-C', value: 115, unit: 'mg/dL', status: 'borderline', min: 0, max: 200, ref: [0, 130], opt: [0, 100], dir: 'lower' },
      { name: 'Total Cholesterol', value: 175, unit: 'mg/dL', status: 'optimal', min: 100, max: 260, ref: [125, 200], opt: [150, 190], dir: 'target' },
      { name: 'Triglycerides', value: 86, unit: 'mg/dL', status: 'optimal', min: 0, max: 250, ref: [0, 150], opt: [0, 100], dir: 'lower' },
    ] },
    { id: 'hematology', name: 'Hematology', icon: 'dna', desc: 'CBC, hemoglobin, WBC', family: null, metrics: [
      { name: 'Hematocrit', value: 41.2, unit: '%', status: 'borderline', min: 30, max: 55, ref: [38, 50], opt: [42, 48], dir: 'target' },
      { name: 'Hemoglobin', value: 13.7, unit: 'g/dL', status: 'borderline', min: 10, max: 19, ref: [13, 17], opt: [14, 16], dir: 'higher' },
      { name: 'Platelets', value: 205, unit: 'K/µL', status: 'optimal', min: 100, max: 500, ref: [150, 400], opt: [200, 350], dir: 'target' },
      { name: 'RBC', value: 4.2, unit: 'M/µL', status: 'deficient', min: 3.5, max: 6.5, ref: [4.5, 5.9], opt: [4.7, 5.5], dir: 'higher' },
      { name: 'WBC', value: 5.3, unit: 'K/µL', status: 'optimal', min: 2, max: 15, ref: [4, 11], opt: [5, 9], dir: 'target' },
    ] },
  ];

  // finalize metric ids + sparks + per-category status counts
  const STATUS_ORDER = ['optimal', 'borderline', 'deficient', 'excess'];
  const totals = { optimal: 0, borderline: 0, deficient: 0, excess: 0 };
  cats.forEach(c => {
    c.counts = { optimal: 0, borderline: 0, deficient: 0, excess: 0 };
    c.metrics.forEach(m => {
      m.id = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      m.category = c.id;
      m.categoryName = c.name;
      if (!m.spark) m.spark = spark(m.value, 5, m.status === 'optimal' ? 0.06 : 0.14);
      c.counts[m.status] = (c.counts[m.status] || 0) + 1;
      totals[m.status] = (totals[m.status] || 0) + 1;
    });
    c.tracked = c.metrics.length;
  });

  const correlations = [
    { supp: 'Selenium', metric: 'Selenium', r: 0.82, sig: 'strong', lag: 30, p: 0.001, n: 6 },
    { supp: 'Vitamin D3', metric: 'Vitamin D', r: 0.78, sig: 'strong', lag: 30, p: 0.003, n: 12 },
    { supp: 'Methylfolate', metric: 'Homocysteine', r: -0.71, sig: 'strong', lag: 60, p: 0.005, n: 8 },
    { supp: 'Omega-3 (EPA/DHA)', metric: 'Triglycerides', r: -0.65, sig: 'moderate', lag: 60, p: 0.012, n: 8 },
    { supp: 'Creatine', metric: 'Lean Mass', r: 0.55, sig: 'moderate', lag: 90, p: 0.090, n: 4 },
    { supp: 'Omega-3 (EPA/DHA)', metric: 'hs-CRP', r: -0.52, sig: 'moderate', lag: 90, p: 0.045, n: 8 },
    { supp: 'Magnesium Glycinate', metric: 'HRV (RMSSD)', r: 0.45, sig: 'moderate', lag: 14, p: 0.020, n: 30 },
    { supp: 'Vitamin E', metric: 'ALT', r: -0.42, sig: 'weak', lag: 90, p: 0.080, n: 6 },
    { supp: 'Magnesium Glycinate', metric: 'Sleep Performance', r: 0.38, sig: 'weak', lag: 7, p: 0.040, n: 30 },
    { supp: 'CoQ10', metric: 'Recovery Score', r: 0.32, sig: 'weak', lag: 30, p: 0.120, n: 20 },
  ];
  const corrStats = { total: 10, strong: 3, moderate: 4, weak: 3, sig: 7 };

  const genetics = [
    { gene: 'NAFLD Risk', confidence: 'Confirmed', note: 'Vitamin E 800 IU, hepatotoxin avoidance', detail: '98th percentile' },
    { gene: 'FAAH', confidence: 'Inferred', note: '120+ day cessation minimum', detail: 'Lower activity' },
    { gene: 'CYP1A2', confidence: 'Inferred', note: '<200mg caffeine, AM only', detail: 'Lower activity' },
  ];

  const phases = [
    { id: 'acute', name: 'Acute', range: 'Days 1–21', days: 21, focus: 'Sleep support, light training', desc: 'Initial withdrawal phase with focus on sleep quality and gentle recovery', state: 'completed', family: 'focus' },
    { id: 'stabilization', name: 'Stabilization', range: 'Days 22–60', days: 39, focus: 'Progressive overload', desc: 'Gradual return to normal training intensity with physiological adaptation', state: 'completed', family: 'vital' },
    { id: 'clearing', name: 'Clearing', range: 'Days 61–120', days: 60, focus: 'FAAH metabolic clearing', desc: 'Extended clearing phase for complete metabolic normalization (FAAH variant)', state: 'completed', family: 'energy' },
    { id: 'optimization', name: 'Optimization', range: 'Days 121–150', days: 30, focus: 'Tier 1 supplements only', desc: 'Final optimization phase with minimal supplementation', state: 'current', family: 'focus' },
  ];

  const cessation = {
    day: 167, target: 150, phaseName: 'Optimization', daysIn: 47,
    stats: { currentDay: 167, daysRemaining: -17, untilNextPhase: '—', complete: 100 },
    phases: phases,
    timeline: [
      { label: 'Started', value: 'December 22, 2025', tone: 'ink' },
      { label: 'Current phase end', value: 'May 21, 2026', tone: 'ink' },
      { label: 'Projected completion', value: 'May 21, 2026', tone: 'vital' },
    ],
    notes: 'FAAH lower-activity variant requires a 120+ day minimum. The previous 76-day attempt (May 5 – July 20, 2025) was insufficient for metabolic normalization.',
    why: 'Lower FAAH activity (K3 inferred from SelfDecode) means slower anandamide breakdown. This extends the metabolic clearing timeline beyond the typical 30–60 day window. The previous 76-day attempt fell short. A minimum of 120 days is required, with 150 days recommended for full metabolic normalization.',
  };

  const versions = [
    { id: 'P6', date: 'Jan 2, 2026', current: true, note: 'Tier-1 reduction for optimization phase' },
    { id: 'P5', date: 'Nov 8, 2025', current: false, note: 'Added Magnesium Glycinate, raised Vitamin D3' },
    { id: 'P4', date: 'Sep 4, 2025', current: false, note: 'Omega-3 dose increase' },
    { id: 'P3', date: 'Jul 20, 2025', current: false, note: 'Cessation restart after insufficient first attempt' },
    { id: 'P2', date: 'May 5, 2025', current: false, note: 'First cessation protocol' },
  ];

  const tiers = [
    { id: 'tier-1', name: 'Tier 1', sub: 'Core daily', count: 6, tone: 'vital' },
    { id: 'tier-2', name: 'Tier 2', sub: 'Targeted', count: 5, tone: 'focus' },
    { id: 'tier-3', name: 'Tier 3', sub: 'Situational', count: 2, tone: 'energy' },
    { id: 'as-needed', name: 'As needed', sub: 'On demand', count: 2, tone: 'neutral' },
  ];

  // preview rows for the WHOOP import success state
  const whoopPreview = [
    { name: 'HRV (RMSSD)', value: '33.7 ms', date: 'Jan 15, 2026' },
    { name: 'Recovery Score', value: '58.6 %', date: 'Jan 15, 2026' },
    { name: 'Resting Heart Rate', value: '55 BPM', date: 'Jan 15, 2026' },
    { name: 'Sleep Duration', value: '7.2 hrs', date: 'Jan 15, 2026' },
    { name: 'Sleep Performance', value: '84 %', date: 'Jan 15, 2026' },
    { name: 'Respiratory Rate', value: '14.8 rpm', date: 'Jan 15, 2026' },
    { name: 'Skin Temp', value: '93.1 °F', date: 'Jan 15, 2026' },
    { name: 'Blood Oxygen', value: '96 %', date: 'Jan 15, 2026' },
    { name: 'Day Strain', value: '11.4', date: 'Jan 15, 2026' },
    { name: 'Calories', value: '2,840 cal', date: 'Jan 15, 2026' },
  ];

  window.ZD = {
    hero: { title: 'Your signals, one frame at a time.', sub: '9 categories, tracked.' },
    statusTotals: totals,
    statusOrder: STATUS_ORDER,
    categories: cats,
    metricsCount: cats.reduce((a, c) => a + c.metrics.length, 0),
    categoryCount: cats.length,
    correlations: correlations,
    corrStats: corrStats,
    genetics: genetics,
    cessation: cessation,
    versions: versions,
    tiers: tiers,
    whoopPreview: whoopPreview,
    activeSupplements: 15,
    protocolVersion: 'P6',
    needLook: 3,
  };

  // helpers
  window.ZD.allMetrics = function () {
    const out = [];
    cats.forEach(c => c.metrics.forEach(m => out.push(m)));
    return out;
  };
  window.ZD.findCategory = function (id) { return cats.find(c => c.id === id); };
  window.ZD.findMetric = function (catId, metricId) {
    const c = cats.find(x => x.id === catId);
    return c && c.metrics.find(m => m.id === metricId);
  };
})();
