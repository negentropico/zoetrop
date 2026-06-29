// HAND-AUTHORED (Trouvant-style) — the Zoetrop levels-of-zoom spine.
//
// SELF-CONTAINED — serve from THIS dir (design-bridge/diagrams). The pre-existing
// design-system boards live one tree over (docs/design-system/) and are reached
// through the `_ds` symlink (design-bridge/diagrams/_ds → ../../docs/design-system),
// so every href stays inside the navigator root and resolves under a plain:
//   python3 -m http.server 8781 --directory design-bridge/diagrams
//   open http://127.0.0.1:8781/index.html
// The symlink preserves directory depth, so each linked board's own relative
// assets (../styles.css, ../../_ds_bundle.js) resolve too.
//
// Schema mirrors the generator (_kit/build-nav-manifest.mjs). The design-system
// boards predate the navigator — they are linked, not regenerated; the generator
// only governs the in-tree .dc.html boards. A `planned` item has no href.
//
// Status reflects what genuinely exists (scan 2026-06-28): the token + component
// layers (L11/L12) and brand are BUILT; service-design + screen-decomposition
// levels (01-06, 08-10) have no artifacts yet → planned.

;(function (g) {
  var DS = "_ds/";   // symlink → ../../docs/design-system (see header)
  g.ZOETROP_NAV = {
    "overview": {
      "title": "Programme overview",
      "href": "00-design-programme/programme-overview.dc.html"
    },
    "reference": [
      { "title": "Vocabulary spine · taxonomy · ontology · grammar", "href": "00-design-programme/vocabulary-spine.dc.html" },
      { "title": "Brand · logo & mark", "href": DS + "guidelines/brand-logo.html" },
      { "title": "Brand · patterns",    "href": DS + "guidelines/brand-patterns.html" }
      // NOTE: the _rounds/round1 + round3 prototypes are intentionally NOT linked
      // here — they are multi-file Babel React apps that don't self-mount standalone
      // (undefined component exports + a 404 sub-resource; superseded snapshots).
      // Re-add only once their mount is repaired, or link as raw "open in tab".
    ],
    "sections": [
      {
        "code": "01", "slug": "01-lifecycle", "dir": "01-lifecycle", "title": "Lifecycle",
        "items": [
          { "code": "L01", "title": "The member health arc — onboard → baseline → protocol → review → sustain", "status": "planned" }
        ]
      },
      {
        "code": "02", "slug": "02-service-journeys", "dir": "02-service-journeys", "title": "Service journeys",
        "items": [
          { "code": "U01", "title": "Member journey over time (effort / emotion, role-tagged)", "status": "planned" }
        ]
      },
      {
        "code": "03", "slug": "03-mental-models", "dir": "03-mental-models", "title": "Mental models",
        "items": [
          { "code": "M01", "title": "How members think about their health data (cityline)", "status": "planned" }
        ]
      },
      {
        "code": "04", "slug": "04-jobs-to-be-done", "dir": "04-jobs-to-be-done", "title": "Jobs to be done",
        "items": [
          { "code": "J01", "title": "Ranked JTBD — understand a lab result, adjust a protocol", "status": "planned" }
        ]
      },
      {
        "code": "05", "slug": "05-flows-of-work", "dir": "05-flows-of-work", "title": "Flows of work",
        "items": [
          { "code": "F01", "title": "Per-job taskflows across screens", "status": "planned" }
        ]
      },
      {
        "code": "06", "slug": "06-service-blueprints", "dir": "06-service-blueprints", "title": "Service blueprints",
        "items": [
          { "code": "B01", "title": "System & surfaces — the full machinery (intake → ingest → engine → protocol → report)", "href": "06-service-blueprints/B01-system-and-surfaces.dc.html", "status": "built",
            "variants": [
              { "label": "lo-fi", "href": "06-service-blueprints/B01-system-and-surfaces.dc.html" },
              { "label": "hi-fi", "href": "06-service-blueprints/B01-system-and-surfaces-hifi.dc.html" },
              { "label": "full",  "href": "06-service-blueprints/B01-system-and-surfaces-full.dc.html" }
            ] }
        ]
      },
      {
        "code": "07", "slug": "07-screens", "dir": "07-screens", "title": "Screens",
        "items": [
          { "code": "S01", "title": "Screens index — the 6 product areas", "href": "07-screens/S01-screens-index.dc.html", "status": "built" },
          { "code": "S02", "title": "Mobile app prototype — Today · Move · Sleep · Trends", "href": DS + "ui_kits/app/index.html", "status": "built" }
        ]
      },
      {
        "code": "08", "slug": "08-panels", "dir": "08-panels", "title": "Panels",
        "items": [
          { "code": "P01", "title": "Detail / analysis panels — correlations, genetics, supplement detail", "status": "planned" }
        ]
      },
      {
        "code": "09", "slug": "09-actions", "dir": "09-actions", "title": "Actions",
        "items": [
          { "code": "A01", "title": "Controls & state transitions", "status": "planned" }
        ]
      },
      {
        "code": "10", "slug": "10-tables", "dir": "10-tables", "title": "Tables",
        "items": [
          { "code": "T01", "title": "Dense surfaces — metrics, supplements, reports list", "status": "planned" }
        ]
      },
      {
        "code": "11", "slug": "11-components", "dir": "11-components", "title": "Components",
        "items": [
          { "code": "C01", "title": "Core — Avatar · Badge · Button · Card · IconButton", "href": DS + "components/core/core.card.html", "status": "built" },
          { "code": "C02", "title": "Data — MetricRing · ProgressBar · Stat", "href": DS + "components/data/data.card.html", "status": "built" },
          { "code": "C03", "title": "Forms — Input · SegmentedControl · Switch", "href": DS + "components/forms/forms.card.html", "status": "built" }
        ]
      },
      {
        "code": "12", "slug": "12-tokens", "dir": "12-tokens", "title": "Tokens",
        "items": [
          { "code": "K01", "title": "Color · metric families", "href": DS + "guidelines/color-families.html", "status": "built" },
          { "code": "K02", "title": "Color · energy ramp",     "href": DS + "guidelines/color-energy.html", "status": "built" },
          { "code": "K03", "title": "Color · vital ramp",      "href": DS + "guidelines/color-vital.html", "status": "built" },
          { "code": "K04", "title": "Color · focus ramp",      "href": DS + "guidelines/color-focus.html", "status": "built" },
          { "code": "K05", "title": "Color · neutral ramp",    "href": DS + "guidelines/color-neutral.html", "status": "built" },
          { "code": "K06", "title": "Color · status tokens",   "href": DS + "guidelines/color-status.html", "status": "built" },
          { "code": "K07", "title": "Spacing · scale",         "href": DS + "guidelines/spacing-scale.html", "status": "built" },
          { "code": "K08", "title": "Spacing · radii",         "href": DS + "guidelines/spacing-radii.html", "status": "built" },
          { "code": "K09", "title": "Spacing · shadows",       "href": DS + "guidelines/spacing-shadows.html", "status": "built" },
          { "code": "K10", "title": "Type · scale",            "href": DS + "guidelines/type-scale.html", "status": "built" },
          { "code": "K11", "title": "Type · display",          "href": DS + "guidelines/type-display.html", "status": "built" },
          { "code": "K12", "title": "Type · body",             "href": DS + "guidelines/type-body.html", "status": "built" },
          { "code": "K13", "title": "Type · data",             "href": DS + "guidelines/type-data.html", "status": "built" }
        ]
      }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
