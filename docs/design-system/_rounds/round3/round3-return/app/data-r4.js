/* ============================================================
   Zoetrop — round 4 sample-data extensions (design artifact
   only — do not integrate). Extends window.ZD in place.
   Loaded after data.js.

   Extraction sample is SYNTHESIZED from the existing metric
   catalog (owner pick, round 4): every field maps to a real
   ZD.metrics entry; values continue each metric's history.
   ============================================================ */
(function () {
  var ZD = window.ZD;

  /* --- ingest pipeline state -------------------------------- */
  ZD.ingest = {
    pendingDocs: 1,
    /* documents in the pipeline (document viewer + review) */
    documents: [
      {
        id: 'doc-0641',
        filename: 'labcorp_2026-06-04.pdf',
        source: 'LabCorp',
        drawDate: 'Jun 4, 2026',
        uploaded: 'Jun 10, 2026',
        pages: 3,
        status: 'needs-review',
        consent: true,
        model: 'claude-extraction v3',
      },
    ],
  };

  /* --- extraction fields for doc-0641 ------------------------
     catId/metricId point into ZD.metrics; raw is the verbatim
     PDF line the value was lifted from; conf is model confidence;
     page/line drive the document-panel highlight. ------------- */
  ZD.extractions = {
    'doc-0641': [
      { id: 'f1', catId: 'vitamins',     metricId: 'vitd',     label: 'Vitamin D, 25-Hydroxy',   value: 58,   unit: 'ng/mL',  conf: 0.98, page: 1, line: 4,  raw: 'Vitamin D, 25-Hydroxy    58    ng/mL    30–100' },
      { id: 'f2', catId: 'vitamins',     metricId: 'vitb12',   label: 'Vitamin B12',             value: 620,  unit: 'pg/mL',  conf: 0.97, page: 1, line: 5,  raw: 'Vitamin B12             620    pg/mL    200–900' },
      { id: 'f3', catId: 'vitamins',     metricId: 'folate',   label: 'Folate (Folic Acid)',     value: 11,   unit: 'ng/mL',  conf: 0.95, page: 1, line: 6,  raw: 'Folate (Folic Acid)     11     ng/mL    >3.0' },
      { id: 'f4', catId: 'minerals',     metricId: 'ferritin', label: 'Ferritin',                value: 24,   unit: 'ng/mL',  conf: 0.91, page: 1, line: 7,  raw: 'Ferritin                24     ng/mL    12–300' },
      { id: 'f5', catId: 'minerals',     metricId: 'zinc',     label: 'Zinc, Plasma',            value: 82,   unit: 'mcg/dL', conf: 0.88, page: 2, line: 2,  raw: 'Zinc, Plasma            82     mcg/dL   56–134' },
      { id: 'f6', catId: 'minerals',     metricId: 'mag',      label: 'Magnesium, RBC',          value: 4.8,  unit: 'mg/dL',  conf: 0.86, page: 2, line: 3,  raw: 'Magnesium, RBC          4.8    mg/dL    4.2–6.8' },
      { id: 'f7', catId: 'inflammatory', metricId: 'hsCRP',    label: 'hs-CRP',                  value: 0.6,  unit: 'mg/L',   conf: 0.99, page: 2, line: 4,  raw: 'C-Reactive Protein, hs  0.6    mg/L     0.0–3.0' },
      { id: 'f8', catId: 'inflammatory', metricId: 'homo',     label: 'Homocysteine',            value: 9.2,  unit: 'umol/L', conf: 0.74, page: 2, line: 5,  raw: 'Homocyst(e)ine          9.2*   umol/L   <15' },
      { id: 'f9', catId: 'hormones',     metricId: 'tsh',      label: 'TSH',                     value: 2.1,  unit: 'mIU/L',  conf: 0.97, page: 3, line: 2,  raw: 'TSH                     2.10   mIU/L    0.40–4.50' },
    ],
  };

  /* --- facsimile page content for the document panel ---------
     Plain text lines per page — rendered as a calm lab-report
     facsimile, NOT a real PDF. line indices match extractions. */
  ZD.docPages = {
    'doc-0641': [
      { header: 'LABCORP — PATIENT REPORT · PAGE 1 OF 3', lines: [
        'Specimen: 118-440-2961-0        Collected: 06/04/2026 07:41',
        'Fasting: Yes                    Reported:  06/06/2026 14:02',
        '— VITAMIN PANEL —',
        'TEST                     RESULT  UNITS    REFERENCE',
        'Vitamin D, 25-Hydroxy    58      ng/mL    30–100',
        'Vitamin B12              620     pg/mL    200–900',
        'Folate (Folic Acid)      11      ng/mL    >3.0',
        'Ferritin                 24      ng/mL    12–300',
      ]},
      { header: 'LABCORP — PATIENT REPORT · PAGE 2 OF 3', lines: [
        '— MINERAL / INFLAMMATORY PANEL —',
        'TEST                     RESULT  UNITS    REFERENCE',
        'Zinc, Plasma             82      mcg/dL   56–134',
        'Magnesium, RBC           4.8     mg/dL    4.2–6.8',
        'C-Reactive Protein, hs   0.6     mg/L     0.0–3.0',
        'Homocyst(e)ine           9.2*    umol/L   <15',
        '* Performed at LabCorp Burlington',
      ]},
      { header: 'LABCORP — PATIENT REPORT · PAGE 3 OF 3', lines: [
        '— THYROID PANEL —',
        'TEST                     RESULT  UNITS    REFERENCE',
        'TSH                      2.10    mIU/L    0.40–4.50',
        '',
        'END OF REPORT',
      ]},
    ],
  };
})();
