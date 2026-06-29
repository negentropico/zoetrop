/* ============================================================
   Zoetrop — round 3 prototype seeded sample dataset
   Exposed on window.ZD — no PHI, design-artifact values only.
   ============================================================ */
window.ZD = {

  /* --- status order ---------------------------------------- */
  statusOrder: ['optimal', 'borderline', 'deficient', 'excess'],

  /* --- categories ------------------------------------------ */
  categories: [
    { id: 'vitamins',        label: 'Vitamins',          icon: 'pill',         counts: { optimal: 4, borderline: 2, deficient: 1 } },
    { id: 'minerals',        label: 'Minerals',          icon: 'gem',          counts: { optimal: 3, borderline: 1, deficient: 2 } },
    { id: 'inflammatory',    label: 'Inflammatory',      icon: 'flame',        counts: { optimal: 1, borderline: 1 } },
    { id: 'metabolic',       label: 'Metabolic',         icon: 'zap',          counts: { optimal: 5, borderline: 1 } },
    { id: 'hormones',        label: 'Hormones',          icon: 'flask-conical',counts: { optimal: 2, borderline: 2, deficient: 1 } },
    { id: 'autonomic',       label: 'Autonomic',         icon: 'heart-pulse',  counts: { optimal: 3, borderline: 1 } },
    { id: 'bodyComposition', label: 'Body Composition',  icon: 'dumbbell',     counts: { optimal: 2, borderline: 1 } },
    { id: 'lipids',          label: 'Lipids',            icon: 'droplet',      counts: { optimal: 3, borderline: 1, excess: 1 } },
    { id: 'hematology',      label: 'Hematology',        icon: 'dna',          counts: { optimal: 4, borderline: 2 } },
  ],

  /* --- metrics (keyed by catId → array) -------------------- */
  metrics: {
    vitamins: [
      { id: 'vitd', name: 'Vitamin D (25-OH)', value: 58, unit: 'ng/mL', status: 'optimal',    opt: [50, 80], ref: [30, 100], min: 0,   max: 120, history: [{date:'Jan',value:34},{date:'Mar',value:41},{date:'Jun',value:52},{date:'Sep',value:58}] },
      { id: 'vitb12', name: 'Vitamin B12',     value: 620, unit: 'pg/mL',status: 'optimal',    opt: [500,900], ref: [200,900], min: 0,  max:1100, history: [{date:'Jan',value:390},{date:'Mar',value:480},{date:'Jun',value:570},{date:'Sep',value:620}] },
      { id: 'folate', name: 'Folate',          value: 11, unit: 'ng/mL', status: 'borderline', opt: [15, 25], ref: [3, 25], min: 0,    max: 30,  history: [{date:'Jan',value:9},{date:'Mar',value:10},{date:'Jun',value:10},{date:'Sep',value:11}] },
      { id: 'vitk2',  name: 'Vitamin K2',      value: 0.8, unit: 'ng/mL',status: 'deficient',  opt: [1, 3],  ref: [0.5, 3], min: 0,   max: 4,   history: [{date:'Jan',value:0.6},{date:'Mar',value:0.7},{date:'Jun',value:0.7},{date:'Sep',value:0.8}] },
      { id: 'vite',   name: 'Vitamin E',       value: 12.4,unit: 'mg/L', status: 'optimal',    opt: [10, 18], ref: [5, 20], min: 0,   max: 25,  history: [{date:'Jan',value:9.2},{date:'Mar',value:10.8},{date:'Jun',value:11.6},{date:'Sep',value:12.4}] },
      { id: 'vita',   name: 'Vitamin A (retinol)',value:64,unit:'mcg/dL', status: 'optimal',    opt: [50,100], ref: [25,100], min: 0,  max: 120, history: [{date:'Jan',value:50},{date:'Mar',value:56},{date:'Jun',value:60},{date:'Sep',value:64}] },
      { id: 'vitc',   name: 'Vitamin C',       value: 0.4, unit: 'mg/dL',status: 'borderline', opt: [0.6,1.5],ref:[0.2,2.0], min:0,   max: 2.5, history: [{date:'Jan',value:0.3},{date:'Mar',value:0.35},{date:'Jun',value:0.38},{date:'Sep',value:0.4}] },
    ],
    minerals: [
      { id: 'zinc',   name: 'Zinc',            value: 82, unit: 'mcg/dL',status: 'optimal',    opt: [80,120], ref: [56,134], min: 40, max: 150, history: [{date:'Jan',value:68},{date:'Mar',value:74},{date:'Jun',value:79},{date:'Sep',value:82}] },
      { id: 'mag',    name: 'Magnesium (RBC)', value: 4.8, unit: 'mg/dL',status: 'optimal',    opt: [5,7],    ref: [4.2,7], min: 3,   max: 8,   history: [{date:'Jan',value:4.1},{date:'Mar',value:4.4},{date:'Jun',value:4.6},{date:'Sep',value:4.8}] },
      { id: 'iron',   name: 'Iron (serum)',    value: 72, unit: 'mcg/dL',status: 'borderline', opt: [85,150], ref: [59,158], min: 40, max: 180, history: [{date:'Jan',value:65},{date:'Mar',value:68},{date:'Jun',value:70},{date:'Sep',value:72}] },
      { id: 'ferritin',name:'Ferritin',        value:24, unit:'ng/mL',   status: 'borderline', opt: [40,200], ref: [12,300], min:5,   max: 320, history: [{date:'Jan',value:19},{date:'Mar',value:21},{date:'Jun',value:22},{date:'Sep',value:24}] },
      { id: 'selenium',name:'Selenium',         value:118,unit:'mcg/L',  status: 'optimal',    opt: [110,165],ref:[80,180],  min:60,  max: 200, history: [{date:'Jan',value:98},{date:'Mar',value:106},{date:'Jun',value:113},{date:'Sep',value:118}] },
      { id: 'copper', name: 'Copper',           value:78, unit:'mcg/dL', status: 'deficient',  opt: [90,130], ref: [75,145], min:50,  max: 160, history: [{date:'Jan',value:70},{date:'Mar',value:73},{date:'Jun',value:76},{date:'Sep',value:78}] },
    ],
    inflammatory: [
      { id: 'hsCRP', name: 'hs-CRP',           value:0.6, unit:'mg/L',  status: 'optimal',    opt: [0,1],    ref: [0,3],   min: 0,  max: 5,   history: [{date:'Jan',value:1.4},{date:'Mar',value:1.1},{date:'Jun',value:0.9},{date:'Sep',value:0.6}] },
      { id: 'homo',  name: 'Homocysteine',      value:9.2, unit:'umol/L',status: 'borderline', opt: [5,9],    ref: [5,15],  min: 3,  max: 18,  history: [{date:'Jan',value:12.4},{date:'Mar',value:11.1},{date:'Jun',value:10.0},{date:'Sep',value:9.2}] },
    ],
    metabolic: [
      { id: 'glucose',name: 'Fasting Glucose', value:88, unit:'mg/dL',  status: 'optimal',    opt: [72,90],  ref: [70,100], min:60, max: 120, history: [{date:'Jan',value:95},{date:'Mar',value:92},{date:'Jun',value:90},{date:'Sep',value:88}] },
      { id: 'a1c',    name: 'HbA1c',           value:5.2, unit:'%',     status: 'optimal',    opt: [4.8,5.4],ref:[4.5,5.7], min:4,  max: 7,   history: [{date:'Jan',value:5.6},{date:'Mar',value:5.4},{date:'Jun',value:5.3},{date:'Sep',value:5.2}] },
      { id: 'creatinine',name:'Creatinine',     value:1.0, unit:'mg/dL', status: 'optimal',   opt: [0.8,1.2],ref:[0.6,1.3], min:0.4,max: 1.6, history: [{date:'Jan',value:1.1},{date:'Mar',value:1.05},{date:'Jun',value:1.0},{date:'Sep',value:1.0}] },
      { id: 'egfr',   name: 'eGFR',            value:98, unit:'mL/min', status: 'optimal',    opt: [90,120], ref: [60,120], min:40, max: 130, history: [{date:'Jan',value:95},{date:'Mar',value:97},{date:'Jun',value:98},{date:'Sep',value:98}] },
      { id: 'sodium', name: 'Sodium',           value:140, unit:'mEq/L', status: 'optimal',   opt: [137,143],ref:[135,145], min:130,max:150,  history: [{date:'Jan',value:139},{date:'Mar',value:140},{date:'Jun',value:140},{date:'Sep',value:140}] },
      { id: 'potassium',name:'Potassium',        value:4.2,unit:'mEq/L', status: 'borderline', opt:[4.0,4.8],ref:[3.5,5.1], min:3.0,max:5.5, history: [{date:'Jan',value:3.8},{date:'Mar',value:3.9},{date:'Jun',value:4.0},{date:'Sep',value:4.2}] },
    ],
    hormones: [
      { id: 'testo',  name: 'Testosterone (Total)',value:650,unit:'ng/dL',status:'optimal',   opt:[600,900], ref:[264,916], min:200,max:1000, history:[{date:'Jan',value:520},{date:'Mar',value:580},{date:'Jun',value:620},{date:'Sep',value:650}] },
      { id: 'freetesto',name:'Free Testosterone', value:14.2,unit:'ng/dL',status:'borderline',opt:[15,25],   ref:[8.7,25.1],min:5,  max:30,   history:[{date:'Jan',value:12},{date:'Mar',value:13},{date:'Jun',value:13.8},{date:'Sep',value:14.2}] },
      { id: 'tsh',    name: 'TSH',               value:2.1, unit:'mIU/L',status:'optimal',    opt:[1,2.5],   ref:[0.4,4.5], min:0,  max:6,    history:[{date:'Jan',value:2.8},{date:'Mar',value:2.5},{date:'Jun',value:2.3},{date:'Sep',value:2.1}] },
      { id: 'cortisol',name:'Cortisol (AM)',      value:18.4,unit:'mcg/dL',status:'borderline',opt:[10,18],  ref:[6,23],    min:4,  max:28,   history:[{date:'Jan',value:22},{date:'Mar',value:21},{date:'Jun',value:20},{date:'Sep',value:18.4}] },
      { id: 'igf1',   name: 'IGF-1',             value:210, unit:'ng/mL',status:'optimal',    opt:[180,280], ref:[80,310],  min:60, max:350,  history:[{date:'Jan',value:185},{date:'Mar',value:195},{date:'Jun',value:202},{date:'Sep',value:210}] },
    ],
    autonomic: [
      { id: 'hrv',    name: 'HRV (rMSSD)',       value:68, unit:'ms',    status:'optimal',     opt:[60,110],  ref:[20,100],  min:15, max:130, history:[{date:'Jan',value:52},{date:'Mar',value:58},{date:'Jun',value:63},{date:'Sep',value:68}] },
      { id: 'rhr',    name: 'Resting HR',         value:54, unit:'bpm',   status:'optimal',    opt:[45,60],   ref:[50,85],   min:40, max:90,  history:[{date:'Jan',value:62},{date:'Mar',value:59},{date:'Jun',value:57},{date:'Sep',value:54}] },
      { id: 'recovery',name:'Recovery Score',    value:78, unit:'%',     status:'optimal',     opt:[70,100],  ref:[0,100],   min:0,  max:100, history:[{date:'Jan',value:62},{date:'Mar',value:67},{date:'Jun',value:73},{date:'Sep',value:78}] },
      { id: 'sleep',  name: 'Sleep Performance', value:82, unit:'%',     status:'borderline',  opt:[85,100],  ref:[0,100],   min:0,  max:100, history:[{date:'Jan',value:74},{date:'Mar',value:76},{date:'Jun',value:79},{date:'Sep',value:82}] },
    ],
    bodyComposition: [
      { id: 'leanmass',name:'Lean Mass',          value:164, unit:'lbs',  status:'optimal',   opt:[155,175], ref:[140,190], min:120,max:210, history:[{date:'Jan',value:158},{date:'Mar',value:160},{date:'Jun',value:162},{date:'Sep',value:164}] },
      { id: 'bodyfat', name: 'Body Fat %',        value:14.2, unit:'%',   status:'optimal',   opt:[10,18],   ref:[8,25],    min:5,  max:30,  history:[{date:'Jan',value:16.8},{date:'Mar',value:15.9},{date:'Jun',value:14.9},{date:'Sep',value:14.2}] },
      { id: 'bmd',     name: 'Bone Mineral Density',value:1.28,unit:'g/cm²',status:'borderline',opt:[1.3,1.6],ref:[1.0,1.8],min:0.8,max:2.0,history:[{date:'Jan',value:1.22},{date:'Mar',value:1.24},{date:'Jun',value:1.26},{date:'Sep',value:1.28}] },
    ],
    lipids: [
      { id: 'tc',     name: 'Total Cholesterol', value:178, unit:'mg/dL', status:'optimal',   opt:[150,200], ref:[125,200], min:100,max:240, history:[{date:'Jan',value:192},{date:'Mar',value:186},{date:'Jun',value:181},{date:'Sep',value:178}] },
      { id: 'ldl',    name: 'LDL Cholesterol',   value:95, unit:'mg/dL',  status:'optimal',   opt:[60,100],  ref:[0,129],   min:40, max:160, history:[{date:'Jan',value:118},{date:'Mar',value:108},{date:'Jun',value:100},{date:'Sep',value:95}] },
      { id: 'hdl',    name: 'HDL Cholesterol',   value:62, unit:'mg/dL',  status:'optimal',   opt:[55,80],   ref:[40,80],   min:30, max:100, history:[{date:'Jan',value:54},{date:'Mar',value:57},{date:'Jun',value:60},{date:'Sep',value:62}] },
      { id: 'trig',   name: 'Triglycerides',     value:88, unit:'mg/dL',  status:'optimal',   opt:[50,100],  ref:[0,150],   min:30, max:200, history:[{date:'Jan',value:112},{date:'Mar',value:104},{date:'Jun',value:94},{date:'Sep',value:88}] },
      { id: 'apob',   name: 'ApoB',              value:98, unit:'mg/dL',  status:'excess',    opt:[60,90],   ref:[0,100],   min:40, max:130, history:[{date:'Jan',value:110},{date:'Mar',value:105},{date:'Jun',value:102},{date:'Sep',value:98}] },
    ],
    hematology: [
      { id: 'rbc',    name: 'RBC',               value:5.1, unit:'M/uL',  status:'optimal',   opt:[4.8,5.4], ref:[4.5,5.9], min:4,  max:6.5, history:[{date:'Jan',value:4.9},{date:'Mar',value:5.0},{date:'Jun',value:5.1},{date:'Sep',value:5.1}] },
      { id: 'wbc',    name: 'WBC',               value:5.8, unit:'K/uL',  status:'optimal',   opt:[4,8],     ref:[3.5,10.5],min:2,  max:12,  history:[{date:'Jan',value:6.2},{date:'Mar',value:6.0},{date:'Jun',value:5.9},{date:'Sep',value:5.8}] },
      { id: 'hgb',    name: 'Hemoglobin',        value:15.2, unit:'g/dL', status:'optimal',   opt:[14,17],   ref:[13.5,17.5],min:12,max:19,  history:[{date:'Jan',value:14.6},{date:'Mar',value:14.9},{date:'Jun',value:15.0},{date:'Sep',value:15.2}] },
      { id: 'hct',    name: 'Hematocrit',        value:44.8, unit:'%',    status:'optimal',   opt:[42,50],   ref:[39,52],   min:35, max:56,  history:[{date:'Jan',value:43},{date:'Mar',value:43.8},{date:'Jun',value:44.3},{date:'Sep',value:44.8}] },
      { id: 'plt',    name: 'Platelets',          value:224, unit:'K/uL', status:'optimal',   opt:[180,320], ref:[150,400], min:100,max:450, history:[{date:'Jan',value:218},{date:'Mar',value:220},{date:'Jun',value:222},{date:'Sep',value:224}] },
      { id: 'neutrophils',name:'Neutrophils %',   value:58, unit:'%',     status:'borderline', opt:[50,70],   ref:[45,75],   min:30, max:80,  history:[{date:'Jan',value:64},{date:'Mar',value:62},{date:'Jun',value:60},{date:'Sep',value:58}] },
    ],
  },

  /* --- correlations ---------------------------------------- */
  correlations: [
    { metric_a: 'Vitamin D',    metric_b: 'Testosterone',  r: 0.72, n: 12, p: 0.008, significance: 'high',   category_a: 'vitamins',  category_b: 'hormones' },
    { metric_a: 'Magnesium',    metric_b: 'HRV',           r: 0.68, n: 12, p: 0.015, significance: 'high',   category_a: 'minerals',  category_b: 'autonomic' },
    { metric_a: 'hs-CRP',       metric_b: 'Recovery',      r: -0.61,n: 12, p: 0.035, significance: 'medium', category_a: 'inflammatory',category_b:'autonomic' },
    { metric_a: 'Sleep Perf',   metric_b: 'HRV',           r: 0.78, n: 12, p: 0.003, significance: 'high',   category_a: 'autonomic', category_b: 'autonomic' },
    { metric_a: 'Zinc',         metric_b: 'Free Testo',    r: 0.58, n: 8,  p: 0.064, significance: 'medium', category_a: 'minerals',  category_b: 'hormones' },
    { metric_a: 'Cortisol',     metric_b: 'HRV',           r: -0.55,n: 12, p: 0.062, significance: 'medium', category_a: 'hormones',  category_b: 'autonomic' },
    { metric_a: 'Glucose',      metric_b: 'Body Fat %',    r: 0.48, n: 6,  p: 0.130, significance: 'low',    category_a: 'metabolic', category_b: 'bodyComposition' },
    { metric_a: 'Folate',       metric_b: 'Homocysteine',  r: -0.71,n: 8,  p: 0.047, significance: 'high',   category_a: 'vitamins',  category_b: 'inflammatory' },
    { metric_a: 'LDL',          metric_b: 'hs-CRP',        r: 0.42, n: 12, p: 0.171, significance: 'low',    category_a: 'lipids',    category_b: 'inflammatory' },
    { metric_a: 'Lean Mass',    metric_b: 'Testosterone',  r: 0.64, n: 6,  p: 0.072, significance: 'medium', category_a: 'bodyComposition',category_b:'hormones' },
  ],

  /* --- protocol versions ----------------------------------- */
  protocolVersions: [
    { id: 'P0', name: 'P0 — Baseline', date: 'Sep 2025', status: 'completed', description: 'Blood work baseline, no interventions.' },
    { id: 'P1', name: 'P1 — Foundation', date: 'Oct 2025', status: 'completed', description: 'Tier 1 core supplements: D3/K2, Mg glycinate, omega-3.' },
    { id: 'P2', name: 'P2 — Optimization', date: 'Nov 2025', status: 'completed', description: 'Added Tier 2: zinc, methylfolate, adaptogens.' },
    { id: 'P3', name: 'P3 — Cessation Prep', date: 'Dec 2025', status: 'completed', description: 'Pre-cessation immune/sleep support, creatine added.' },
    { id: 'P4', name: 'P4 — Active Cessation', date: 'Dec 2025', status: 'active', description: 'FAAH-informed cessation protocol — Day 171 of 150 target.' },
  ],

  /* --- supplements ----------------------------------------- */
  supplements: {
    tier1: [
      { name: 'Vitamin D3 + K2', dose: '5000 IU D3 / 200 mcg K2', timing: 'Morning with fat', rationale: 'Optimize VD 50–80 ng/mL, K2 for D transport' },
      { name: 'Magnesium Glycinate', dose: '400 mg elemental', timing: 'Evening', rationale: 'RBC Mg, sleep quality, HRV support' },
      { name: 'Omega-3 (EPA+DHA)', dose: '3g combined', timing: 'With meals', rationale: 'hs-CRP reduction, lipid optimization' },
      { name: 'Zinc Bisglycinate', dose: '30 mg', timing: 'Evening (away from Fe)', rationale: 'Testosterone support, immune function' },
    ],
    tier2: [
      { name: 'Methylfolate (5-MTHF)', dose: '1 mg', timing: 'Morning', rationale: 'Homocysteine reduction, MTHFR support' },
      { name: 'Ashwagandha (KSM-66)', dose: '600 mg', timing: 'Evening', rationale: 'Cortisol modulation, stress resilience' },
      { name: 'Creatine Monohydrate', dose: '5 g', timing: 'Any time', rationale: 'Lean mass, cognition, creatine kinase normalization' },
    ],
    tier3: [
      { name: 'Vitamin C (buffered)', dose: '1 g', timing: 'With meals', rationale: 'Collagen synthesis, iron absorption' },
      { name: 'Boron', dose: '3 mg', timing: 'Morning', rationale: 'SHBG modulation, Vitamin D metabolism' },
    ],
  },

  /* --- cessation phases ------------------------------------ */
  cessationPhases: [
    { id: 'acute',         name: 'Acute',         days: 21,  state: 'completed', start: 'Dec 23', end: 'Jan 13', description: 'Sleep support, light training, max Mg + adaptogens' },
    { id: 'stabilization', name: 'Stabilization', days: 39,  state: 'completed', start: 'Jan 14', end: 'Feb 21', description: 'Progressive overload, HRV monitoring' },
    { id: 'clearing',      name: 'Clearing',       days: 60,  state: 'current',  start: 'Feb 22', end: 'Apr 22', description: 'FAAH metabolic clearing phase — peak neuroplasticity' },
    { id: 'optimization',  name: 'Optimization',  days: 30,  state: 'upcoming', start: 'Apr 23', end: 'May 22', description: 'Tier 1 only, deep work focus, full labs' },
  ],

  /* --- dashboard summary ----------------------------------- */
  cessationDay: 171,
  cessationTarget: 150,

  /* --- genetics -------------------------------------------- */
  genetics: [
    { gene: 'MTHFR C677T', variant: 'Heterozygous (C/T)', impact: 'Reduced methylfolate → elevated homocysteine', response: 'Active methylfolate (5-MTHF) supplementation', status: 'mitigated' },
    { gene: 'VDR BsmI',    variant: 'TT (low D absorption)',impact: 'Higher D3 dose needed for target range',       response: '5000 IU D3 daily, quarterly monitoring',         status: 'mitigated' },
    { gene: 'APOE',        variant: 'E3/E3 (neutral)',      impact: 'Standard lipid metabolism',                    response: 'Monitor ApoB, standard lipid protocol',           status: 'nominal' },
    { gene: 'COMT Val158Met',variant:'Heterozygous (Val/Met)',impact:'Moderate dopamine clearance speed',           response: 'Balanced stimulant use, monitor cortisol',         status: 'monitoring' },
    { gene: 'ACTN3 R577X', variant: 'RX (mixed fiber)',     impact: 'Mixed fast/slow twitch profile',               response: 'Balanced training — strength + endurance split',   status: 'nominal' },
  ],
};
