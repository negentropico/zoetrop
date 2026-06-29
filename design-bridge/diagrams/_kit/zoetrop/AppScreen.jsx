/* =========================================================================
   B01 SCREEN-KIT — the SSOT React chassis, rendered by the DC runtime
   (<x-import from="./zoetrop/AppScreen.jsx" component="FlowBoard" fidelity="…">).
   ONE data source (screens.B01.js → window.ZOETROP_B01) drives THREE fidelities:
     lofi → .lf-* skeleton wireframes
     hifi → .hf-* token-pure mini-screens
     full → .zs-* real app views (TopBar + Sidebar + PageHeader + dense content)
   The shell (TopBar / Sidebar / PageHeader) is defined ONCE; every content type
   implements a { lofi, hifi, full } renderer trio so the tiers can never drift.
   Styling lives in app-screen.css. `React` is a runtime global — do NOT import it.
   Loaded via @babel/standalone (presets react+typescript) → CommonJS exports.
   ========================================================================= */

/* practitioner sidebar — nav-tree.ts groups, prefixed with /clients (mirrors the
   old full board NAV). [id, label]; active item = frame.surface. */
var NAV = [
  ["clients", "Clients"],
  ["dashboard", "Dashboard"],
  ["metrics", "Metrics"],
  ["protocol", "Protocol"],
  ["insights", "Insights"],
  ["reports", "Reports"],
  ["ingest", "Ingest"],
];

/* status → pill class (from the old full board) */
var PILL = { optimal: "g", borderline: "a", deficient: "r", excess: "e" };
/* status → lo-fi chip class */
var LFCHIP = { optimal: "g", borderline: "a", deficient: "r", excess: "a" };

function html(s) { return { __html: s }; }

/* shared lucide-style glyph chrome — stroked, inherits currentColor */
function Svg(props) {
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: "100%", height: "100%", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" },
    props.children
  );
}

/* nav glyphs approximating the live lucide icons (the full-tier fidelity bump):
   Clients=Users · Dashboard=LayoutGrid · Metrics=Activity · Protocol=ListChecks
   · Insights=GitCompare · Reports=FileText · Ingest=FileUp */
function Glyph(props) {
  switch (props.id) {
    case "clients":
      return (
        <Svg>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      );
    case "dashboard":
      return (
        <Svg>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </Svg>
      );
    case "metrics":
      return (
        <Svg><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
      );
    case "protocol":
      return (
        <Svg>
          <path d="m3 17 2 2 4-4" />
          <path d="m3 7 2 2 4-4" />
          <path d="M13 6h8" />
          <path d="M13 12h8" />
          <path d="M13 18h8" />
        </Svg>
      );
    case "insights":
      return (
        <Svg>
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          <path d="M11 18H8a2 2 0 0 1-2-2V9" />
        </Svg>
      );
    case "reports":
      return (
        <Svg>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </Svg>
      );
    case "ingest":
      return (
        <Svg>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 12v6" />
          <path d="m15 15-3-3-3 3" />
        </Svg>
      );
    default:
      return null;
  }
}

/* ── full-tier shell (defined ONCE) ── */
function TopBar(props) {
  return (
    <div className="zs-top">
      <div className="zs-wm"><span className="mk">Z</span>Zoetrop</div>
      <div className="zs-chip"><span className="av"></span>{props.subject}</div>
    </div>
  );
}

function Sidebar(props) {
  return (
    <div className="zs-side">
      {NAV.map(function (n) {
        return (
          <div className={"zs-nav" + (n[0] === props.active ? " on" : "")} key={n[0]}>
            <span className="i"><Glyph id={n[0]} /></span>{n[1]}
          </div>
        );
      })}
    </div>
  );
}

function PageHeader(props) {
  var f = props.frame;
  return (
    <div className="zs-ph">
      <div><div className="eye">{f.eye}</div><h3>{f.h}</h3></div>
      {f.sub ? <div className="sub">{f.sub}</div> : null}
      {f.act ? <span className={"act" + (f.actgn ? " gn" : "")}>{f.act}</span> : null}
    </div>
  );
}

/* ── content renderer LIBRARY — contentType × { lofi, hifi, full } matrix ──
   Each trio derives from the SAME frame.content payload, so a data edit moves
   all three fidelities together. */
var RENDER = {
  form: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          {c.fields.map(function (fd, i) { return <div className={"lf-f" + (i % 2 ? " sh" : "")} key={i}></div>; })}
          {f.act ? <div className="lf-btn"></div> : null}
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          <div className="hf-t">{f.h}</div>
          {c.fields.map(function (fd, i) {
            return (
              <React.Fragment key={i}>
                <div className="hf-lab">{fd[0]}</div>
                <div className="hf-inp">{fd[2] ? <span className="ph">{fd[1]}</span> : fd[1]}</div>
              </React.Fragment>
            );
          })}
          {f.act ? <div className="hf-cta">{f.act}</div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return c.fields.map(function (fd, i) {
        return (
          <div className="zs-field" key={i}>
            <span className="zs-lab">{fd[0]}</span>
            <div className="zs-inp">{fd[2] ? <span className="ph">{fd[1]}</span> : fd[1]}</div>
          </div>
        );
      });
    },
  },

  opts: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          {c.opts.map(function (o, i) {
            return <div className="lf-row" key={i}><span className={"lf-rad" + (o[2] ? " on" : "")}></span><div className={"lf-bar" + (i % 2 ? " sh" : "")}></div></div>;
          })}
          {f.act ? <div className="lf-btn"></div> : null}
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          {c.opts.map(function (o, i) {
            return <div className={"hf-opt" + (o[2] ? " on" : "")} key={i}><span className="r"></span><span className="ot">{o[0]}</span></div>;
          })}
          {f.act ? <div className="hf-cta">{f.act}</div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return c.opts.map(function (o, i) {
        return (
          <div className={"zs-opt" + (o[2] ? " on" : "")} key={i}>
            <span className="r"></span>
            <div><div className="ot">{o[0]}</div><div className="od">{o[1]}</div></div>
          </div>
        );
      });
    },
  },

  ring: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-ring"></div>
          <div className="lf-bar sh"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      var s = c.stats || [];
      return (
        <React.Fragment>
          <div className="hf-ring"></div>
          {s[0] ? <div className="hf-pct"><span className="v">{s[0][0]}</span><span className="b"><i style={{ width: c.v + "%" }}></i></span></div> : null}
          {s[1] ? <div className="hf-pct"><span className="v">{s[1][0]}</span><span className="b"><i style={{ width: "80%" }}></i></span></div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return (
        <div className="zs-ringwrap">
          <div className="zs-ring" style={{ "--v": c.v + "%" }}></div>
          <div className="zs-stats" style={{ flexDirection: "column", gap: 13 }}>
            {(c.stats || []).map(function (s, i) {
              return <div className="zs-stat" key={i}><span className="v sm">{s[0]}</span><span className="l">{s[1]}</span></div>;
            })}
          </div>
        </div>
      );
    },
  },

  tiles: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-spread">{c.tiles.map(function (t, i) { return <div className="lf-f" key={i}></div>; })}</div>
          <div className="lf-bar sh"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          <div className="hf-tiles">
            {c.tiles.map(function (t, i) { return <div className="hf-tile" key={i}><span className={"d " + (t[2] || "")}></span>{t[0]}</div>; })}
          </div>
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return (
        <div className="zs-tiles">
          {c.tiles.map(function (t, i) {
            return <div className="zs-tile" key={i}><span className={"d " + (t[2] || "")}></span><span className="tt">{t[0]}</span><span className="ts">{t[1]}</span></div>;
          })}
        </div>
      );
    },
  },

  hero: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-hero"></div>
          <div className="lf-bar sh"></div>
          {f.act ? <div className="lf-btn"></div> : null}
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <div className="hf-hero"><div className="ht">{c.t}</div><span className="hcta">{c.cta}</span></div>
      );
    },
    full: function (c, f) {
      return (
        <div className="zs-hero"><div className="ht">{c.t}</div><div className="hs">{c.s}</div><span className="hcta">{c.cta}</span></div>
      );
    },
  },

  docs: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          {c.docs.map(function (d, i) { return <div className={"lf-bar" + (i === c.docs.length - 1 ? " sh" : "")} key={i}></div>; })}
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          {c.docs.map(function (d, i) { return <div className="hf-doc" key={i}>{d[0]}</div>; })}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return c.docs.map(function (d, i) {
        return <div className="zs-doc" key={i}><span className="fi"></span>{d[0]}<span className="dd">{d[1]}</span></div>;
      });
    },
  },

  gate: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          {f.foc ? <div className="lf-row"><span className="lf-rad on"></span><div className="lf-bar"></div></div> : null}
          <div className="lf-ok"></div>
          <div className="lf-grn"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          <div className="hf-ok"><span className="ck">✓</span>{c.ok}</div>
          {f.act ? <div className={"hf-cta" + (f.actgn ? " gn" : "")}>{f.act}</div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return (
        <React.Fragment>
          <div className="zs-ok"><span className="ck">✓</span>{c.ok}</div>
          {c.note ? <div className="zs-note">{c.note}</div> : null}
        </React.Fragment>
      );
    },
  },

  table: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-chips">{c.rows.map(function (r, i) { return <span className={"lf-chip " + (LFCHIP[r[2]] || "p")} key={i}></span>; })}</div>
          <div className="lf-bar sh"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          {c.rows.map(function (r, i) {
            var st = PILL[r[2]];
            return (
              <div className="hf-mrow" key={i}>
                <span className="nm"></span>
                {st ? <span className={"hf-chip " + st}>{String(r[2]).slice(0, 3).toUpperCase()}</span> : null}
                {r[3] ? <span className="hf-chip k">{r[3]}</span> : null}
              </div>
            );
          })}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return c.rows.map(function (r, i) {
        return (
          <div className="zs-trow" key={i}>
            <span className="nm">{r[0]}</span>
            <span className="vl">{r[1]}</span>
            {r[2] ? <span className={"zs-pill " + (PILL[r[2]] || "a")}>{String(r[2]).slice(0, 3)}</span> : null}
            {r[3] ? <span className="zs-k">{r[3]}</span> : null}
          </div>
        );
      });
    },
  },

  trend: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-hero"></div>
          <div className="lf-bar sh"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      var s = c.stats || [];
      return (
        <React.Fragment>
          <div className="hf-spark" dangerouslySetInnerHTML={html(c.svg)}></div>
          {s[0] ? <div className="hf-pct"><span className="v">{s[0][0]}</span><span className="b"><i style={{ width: "52%" }}></i></span></div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return (
        <React.Fragment>
          <div className="zs-spark" dangerouslySetInnerHTML={html(c.svg)}></div>
          <div className="zs-stats">
            {(c.stats || []).map(function (s, i) { return <div className="zs-stat" key={i}><span className="v sm">{s[0]}</span><span className="l">{s[1]}</span></div>; })}
          </div>
        </React.Fragment>
      );
    },
  },

  overview: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-bar"></div>
          <div className="lf-bar sh"></div>
          <div className="lf-bar xs"></div>
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          {f.h ? <div className="hf-t">{f.h}</div> : null}
          <div className="hf-tiles">
            {c.cards.map(function (cd, i) { return <div className="hf-tile" key={i}><span className="d"></span>{cd[0]} {cd[1]}</div>; })}
          </div>
        </React.Fragment>
      );
    },
    full: function (c, f) {
      return (
        <div className="zs-row">
          {c.cards.map(function (cd, i) {
            return (
              <div className="zs-tile" key={i}>
                <span className="tt" style={{ marginBottom: "auto" }}>{cd[0]}</span>
                <span className="zs-stat"><span className="v sm">{cd[1]}</span><span className="l">{cd[2]}</span></span>
              </div>
            );
          })}
        </div>
      );
    },
  },

  compare: {
    lofi: function (c, f) {
      return (
        <React.Fragment>
          <div className="lf-h"></div>
          <div className="lf-spread"><div className="lf-f"></div><div className="lf-f"></div></div>
          <div className="lf-bar sh"></div>
          {f.act ? <div className="lf-btn"></div> : null}
        </React.Fragment>
      );
    },
    hifi: function (c, f) {
      return (
        <React.Fragment>
          <div className="hf-side">
            {c.cols.map(function (col, i) {
              return (
                <div className="hf-pane" key={i}>
                  {col.map(function (x, j) {
                    return <div className="hf-mrow" key={j}><span className="nm"></span>{x[1] ? <span className={"hf-chip " + (x[1] === "+" ? "g" : "k")}>{x[1]}</span> : null}</div>;
                  })}
                </div>
              );
            })}
          </div>
          {f.act ? <div className="hf-cta">{f.act}</div> : null}
        </React.Fragment>
      );
    },
    full: function (c, f) {
      var heads = ["Current P5", "Proposed P6"];
      return (
        <div className="zs-row" style={{ flex: 1, minHeight: 0 }}>
          {c.cols.map(function (col, i) {
            return (
              <div className="zs-tile" key={i}>
                <span className="tt" style={{ marginBottom: 8 }}>{heads[i]}</span>
                {col.map(function (x, j) {
                  return <div className="zs-trow" style={{ padding: "6px 0" }} key={j}><span className="nm" style={{ fontSize: 18 }}>{x[0]}</span>{x[1] ? <span className="zs-k">{x[1]}</span> : null}</div>;
                })}
              </div>
            );
          })}
        </div>
      );
    },
  },
};

function Content(props) {
  var f = props.frame, fid = props.fidelity;
  var c = f.content || {};
  var trio = RENDER[c.type];
  if (!trio || !trio[fid]) return null;
  return trio[fid](c, f);
}

/* AppScreen(frame, fidelity) — composes shell + content at the requested tier. */
function AppScreen(props) {
  var f = props.frame, fid = props.fidelity;
  var cls = "nb" + (f.foc ? " foc" : "") + (f.term ? " term" : "");

  if (fid === "full") {
    return (
      <div className={cls}>
        <div className="zs-wrap">
          <div className="zs-screen">
            <TopBar subject={props.subject} />
            <div className="zs-body">
              <Sidebar active={f.surface} />
              <div className="zs-main">
                <PageHeader frame={f} />
                <div className="zs-c"><Content frame={f} fidelity="full" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fid === "hifi") {
    return (
      <div className={cls}>
        <div className="hf">
          <div className="hf-bar"><i></i><span className="u">{f.u}</span></div>
          <div className="hf-b">
            <div className="hf-eye">{f.eye}</div>
            <Content frame={f} fidelity="hifi" />
          </div>
        </div>
      </div>
    );
  }

  /* lofi */
  return (
    <div className={cls}>
      <div className="lf">
        <div className="lf-cap">{f.cap}</div>
        <Content frame={f} fidelity="lofi" />
      </div>
    </div>
  );
}

/* FlowBoard({ fidelity }) — the six-stage periwinkle-spine layout, self-sourced
   from window.ZOETROP_B01 (falls back to props.data). One <AppScreen> per frame. */
function FlowBoard(props) {
  var fidelity = props.fidelity || "full";
  var data = props.data || (typeof window !== "undefined" && window.ZOETROP_B01) || { meta: {}, lanes: [] };
  var subject = (data.meta && data.meta.subject) || "";
  return (
    <div className={"fb fb-" + fidelity}>
      <div className="lanes">
        {(data.lanes || []).map(function (lane, li) {
          var frames = lane.frames || [];
          var sticky = lane.sticky;
          return (
            <div className="lane" key={li}>
              <div className={"stb" + (lane.term ? " term" : "")}>
                <div className="se">{lane.stage}</div>
                <div className="sn">{lane.name}</div>
                <div className="sp">{lane.path}</div>
              </div>
              <div className="track">
                {frames.map(function (frame, fi) {
                  return (
                    <React.Fragment key={fi}>
                      {fi > 0 ? <span className="arr">→</span> : null}
                      <AppScreen frame={frame} fidelity={fidelity} subject={subject} />
                    </React.Fragment>
                  );
                })}
                {lane.name === "Sustain" ? <span className="arr mut">⤴</span> : null}
                {sticky ? (
                  <div className={"sticky" + (sticky[0] === "sys" ? " sys" : "")}>
                    <div className="h">{sticky[1]}</div>
                    <div className="b" dangerouslySetInnerHTML={html(sticky[2])}></div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

module.exports = { AppScreen: AppScreen, FlowBoard: FlowBoard };
