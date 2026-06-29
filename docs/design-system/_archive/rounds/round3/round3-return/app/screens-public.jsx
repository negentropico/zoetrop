/* ============================================================
   Zoetrop — round 4: public surfaces
   / (landing) and /login — outside the app shell, same brand at
   marketing register: paper + dot grain, spiral mark, mono
   eyebrows, frame-card language. ONE direction (owner pick).
   Copy is PLACEHOLDER, flagged in CHANGES.md — no marketing
   copy exists yet.
   ============================================================ */

function PublicTopbar({ cta = true }) {
  return (
    <header className="zt-pub-top">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
        <SpiralMark size={24} />
        <span className="zn-wordmark">zoetrop<span style={{ color: 'var(--accent)' }}>.</span></span>
      </Link>
      {cta && <Link to="/login" className="zt-pill">Sign in</Link>}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="zt-pub-foot">
      <SpiralMark size={16} color="var(--text-faint)" />
      <span className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>Zoetrop · a personal instrument · single-owner</span>
    </footer>
  );
}

/* ============================================================
   Landing (/)
   ============================================================ */
function LandingScreen() {
  const m = window.ZD.metrics.vitamins[0]; /* Vitamin D — the strongest trend */
  const stats = [
    { label: 'Markers tracked', value: '46' },
    { label: 'Categories', value: '9' },
    { label: 'Protocol versions', value: '5' },
    { label: 'Correlated pairs', value: String(window.ZD.correlations.length) },
  ];
  return (
    <div className="zt-public" data-screen-label="Landing">
      <PublicTopbar />

      <main className="zt-pub-main">
        <section className="zt-pub-hero">
          <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)' }}>Personal health protocol instrument</div>
          <h1 className="zt-pub-h1">Your bloodwork,<br />one frame at a time.</h1>
          <p className="zt-pub-sub">
            Zoetrop stitches labs, wearables and protocol notes into one calm
            picture — every marker read against its optimal range, every
            reading a frame in the sequence.
          </p>
          <div style={{ display: 'flex', gap: 'var(--gap-md)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="zt-btn-ink" style={{ textDecoration: 'none', color: 'var(--text-on-ink)' }}>Sign in</Link>
            <span className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>Owner-only · invites from inside</span>
          </div>
        </section>

        {/* the instrument, not a brochure — one real frame card */}
        <section className="zt-pub-frame">
          <Card style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--gap-lg)', flexWrap: 'wrap', marginBottom: 'var(--gap-lg)' }}>
              <div>
                <div className="zt-eyebrow" style={{ marginBottom: 8 }}>{m.name}</div>
                <span className="zt-readout" style={{ fontSize: 'var(--text-2xl)', color: 'var(--ink)' }}>
                  {m.value} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit.toUpperCase()}</span>
                </span>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <TrendChart metric={m} height={260} />
          </Card>
          <div className="zt-pub-statrow">
            {stats.map(s => (
              <div key={s.label}>
                <div className="zt-readout zt-tnum" style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)' }}>{s.value}</div>
                <div className="zt-eyebrow" style={{ marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="zt-pub-rows">
          {[
            { n: '01', title: 'Ingest with a review gate', body: 'Lab PDFs are AI-extracted, then every field is approved, edited or rejected by you before it touches a metric.' },
            { n: '02', title: 'Protocol as versions', body: 'Supplement stacks are versioned and diffable — what changed between P3 and P4 is one glyph row away.' },
            { n: '03', title: 'Signals, not alarms', body: 'Trends draw in ink; judgment lives only in the four status colors. The instrument states, you decide.' },
          ].map((r, i, arr) => (
            <div key={r.n} className="zt-pub-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span className="zt-eyebrow zt-tnum" style={{ color: 'var(--text-faint)' }}>{r.n}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--ink)' }}>{r.title}</span>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{r.body}</p>
            </div>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

/* ============================================================
   Login (/login)
   ============================================================ */
function LoginScreen() {
  return (
    <div className="zt-public" data-screen-label="Login" style={{ display: 'flex', flexDirection: 'column' }}>
      <PublicTopbar cta={false} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--gap-2xl) var(--gap-xl)' }}>
        <Card style={{ width: '100%', maxWidth: 384, padding: 'var(--gap-2xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--gap-2xl)' }}>
            <SpiralMark size={36} />
            <div className="zt-eyebrow" style={{ marginTop: 'var(--gap-lg)' }}>Owner access</div>
            <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '6px 0 0' }}>Back to the sequence</h1>
          </div>
          <form onSubmit={e => { e.preventDefault(); navigate('/dashboard'); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
            <label className="zt-field">
              <span className="zt-eyebrow">Email</span>
              <input type="email" placeholder="owner@example.com" autoComplete="email" />
            </label>
            <label className="zt-field">
              <span className="zt-eyebrow">Password</span>
              <input type="password" placeholder="••••••••••••" autoComplete="current-password" />
            </label>
            <button type="submit" className="zt-btn-ink" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>Sign in</button>
          </form>
          <p style={{ margin: 'var(--gap-xl) 0 0', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textWrap: 'pretty' }}>
            Single-owner instrument. New viewers join by invite from Settings.
          </p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}

Object.assign(window, { LandingScreen, LoginScreen });
