// HAND-AUTHORED (Trouvant-style) — the Zoetrop levels-of-zoom spine. This pass
// ships the navigator shell + two anchor boards (00 overview, 07 screens); the
// other 11 levels are honest `planned` placeholders (no href → non-navigable,
// the chip still shows the level is mapped-but-unbuilt).
//
// Schema mirrors the generator output (_kit/build-nav-manifest.mjs). When a level
// grows real *.dc.html boards + a *-register.dc.html, run the generator and it
// will overwrite this file. Until then, edit here by hand.

;(function (g) {
  g.ZOETROP_NAV = {
    "overview": {
      "title": "Programme overview",
      "href": "00-design-programme/programme-overview.dc.html"
    },
    "reference": [],
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
          { "code": "B01", "title": "Front-stage ↔ back-stage — ingest → analysis → insight → report", "status": "planned" }
        ]
      },
      {
        "code": "07", "slug": "07-screens", "dir": "07-screens", "title": "Screens",
        "items": [
          { "code": "S01", "title": "Screens index — the 6 product areas", "href": "07-screens/S01-screens-index.dc.html", "status": "built" }
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
          { "code": "C01", "title": "Screen component register", "status": "planned" }
        ]
      },
      {
        "code": "12", "slug": "12-tokens", "dir": "12-tokens", "title": "Tokens",
        "items": [
          { "code": "K01", "title": "Token-layer board (tokens already live in docs/design-system/tokens)", "status": "planned" }
        ]
      }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
