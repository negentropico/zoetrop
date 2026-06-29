/* ============================================================
   Zoetrop — round 5: WHOOP populated state, Vault connected
   state, Settings invites flow.
   Loaded AFTER screens.jsx — WhoopScreen / VaultScreen /
   SettingsScreen here replace the round-3 shallow states.

   Trust model (owner pick, round 5): WHOOP and Vault are
   TRUSTED SOURCES — their writes land directly, no review
   gate. Only lab PDFs pass extraction review. Both screens
   state this in the meta strip and the footer note.
   ============================================================ */

/* ---- shared: footer trust note (mirrors the review screen's
   footer idiom) ---------------------------------------------- */
function TrustNote({ children, right }) {
  return (
    <div style={{ marginTop: 'var(--gap-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--gap-lg)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textWrap: 'pretty' }}>{children}</span>
      {right}
    </div>
  );
}

/* ---- shared: meta stat strip (DocumentScreen idiom) --------- */
function MetaStrip({ stats }) {
  return (
    <Card>
      <div className="zt-stat-strip">
        {stats.map(s => (
          <div key={s.label} className="zt-stat">
            <div className="zt-eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
            <div className="zt-tnum zt-meta-val" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{s.value}</div>
            {s.sub && <div className="zt-eyebrow zt-meta-sub" style={{ marginTop: 5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   WHOOP import (/import/whoop) — POPULATED state (round 5).
   Mapping preview: export field → autonomic metric, point
   counts, recent-shape sparkline (the mapped metric's own
   history), last parsed value. tdee shows the unmapped/
   skipped treatment. Sample table = last 5 daily records.
   ============================================================ */
function WhoopScreen({ path }) {
  const wh = window.ZD.whoop;
  const findMetric = (f) => (f.metricId ? (window.ZD.metrics[f.catId] || []).find(m => m.id === f.metricId) : null);
  const mapped = wh.fields.filter(f => f.metricId).length;

  const stats = [
    { label: 'Last import',   value: wh.imported,                       sub: wh.file },
    { label: 'Daily records', value: wh.records,                        sub: wh.rangeStart + ' – ' + wh.lastRecord },
    { label: 'Fields mapped', value: mapped + ' / ' + wh.fields.length, sub: '→ autonomic' },
    { label: 'Writes',        value: 'Direct',                          sub: 'trusted source · no gate' },
  ];

  const sampleCols = [
    { key: 'date',     label: 'Date',           mono: true, sortable: false },
    { key: 'hrv',      label: 'HRV · ms',       mono: true, align: 'right' },
    { key: 'recovery', label: 'Recovery · %',   mono: true, align: 'right' },
    { key: 'rhr',      label: 'RHR · bpm',      mono: true, align: 'right' },
    { key: 'sleep',    label: 'Sleep · %',      mono: true, align: 'right' },
    { key: 'tdee',     label: 'TDEE · kcal',    mono: true, align: 'right' },
  ];

  return (
    <AppShell path={path}>
      <div data-screen-label="WHOOP import">
        <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'WHOOP' }]}
          title="WHOOP import" sub="Daily autonomic signals from the WHOOP Analyzer export" />

        <section className="zt-section">
          <MetaStrip stats={stats} />
        </section>

        <section className="zt-section">
          <SectionLabel count={wh.fields.length}>Field mapping</SectionLabel>
          <Card pad={false}>
            {wh.fields.map((f, i, arr) => {
              const m = findMetric(f);
              const inner = (
                <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: m ? 'pointer' : 'default' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: m ? 'var(--text)' : 'var(--text-muted)' }}>{f.key}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span className="zt-eyebrow" style={{ letterSpacing: '0.06em', color: m ? undefined : 'var(--text-faint)' }}>
                        {m ? '→ ' + f.catId + '/' + f.metricId : 'not tracked · skipped'}
                      </span>
                      <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>{f.points} pts</span>
                    </div>
                  </div>
                  {m && <Sparkline data={m.history.slice(-8)} width={56} height={18} status={m.status} />}
                  <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 56 }}>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: m ? 'var(--ink)' : 'var(--text-faint)' }}>{f.last}</div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{f.unit}</div>
                  </div>
                  {m ? <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" /> : <span style={{ width: 16, flex: '0 0 auto' }}></span>}
                </div>
              );
              return m
                ? <Link key={f.key} to={'/metrics/' + f.catId + '/' + f.metricId}>{inner}</Link>
                : <div key={f.key}>{inner}</div>;
            })}
          </Card>
        </section>

        <section className="zt-section">
          <SectionLabel count={wh.sample.length}>Last parsed records</SectionLabel>
          <Card pad={false}>
            <DataTable columns={sampleCols} rows={wh.sample} rowKey={(r) => r.date} />
          </Card>
        </section>

        <section className="zt-section">
          <SectionLabel>Update</SectionLabel>
          <Card>
            <div className="zt-dropzone" style={{ padding: 'var(--gap-xl)' }}>
              <Icon name="upload-cloud" size={26} stroke={1.5} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 'var(--text-sm)', marginBottom: 4, color: 'var(--text-secondary)' }}>Drop a newer <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{wh.file}</code> here</div>
              <div className="zt-eyebrow" style={{ color: 'var(--text-faint)' }}>re-imports are idempotent — records keyed by date</div>
            </div>
          </Card>
        </section>

        <TrustNote right={<Link to="/ingest" className="zt-link">Ingest overview <Icon name="arrow-right" size={14} stroke={2} /></Link>}>
          WHOOP is a trusted source — records write directly to Autonomic on import. Lab PDFs stay behind the review gate.
        </TrustNote>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Vault import (/import/vault) — CONNECTED state (round 5).
   Path + sync meta, recently synced notes, metric targets
   lifted from vault target notes.
   ============================================================ */
function VaultScreen({ path }) {
  const v = window.ZD.vault;
  const stats = [
    { label: 'Vault path',  value: v.path,                              sub: 'Obsidian' },
    { label: 'Last sync',   value: v.lastSync,                          sub: 'auto · ' + v.schedule },
    { label: 'Synced',      value: v.notes + ' notes · ' + v.targets.length + ' targets' },
    { label: 'Writes',      value: 'Direct',                            sub: 'trusted source · no gate' },
  ];
  return (
    <AppShell path={path}>
      <div data-screen-label="Vault import">
        <PageHeader crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Vault' }]}
          title="Vault import" sub="Protocol notes and metric targets from the Obsidian vault"
          right={<button type="button" className="zt-pill"><Icon name="refresh-cw" size={13} stroke={1.8} />Sync now</button>} />

        <section className="zt-section">
          <MetaStrip stats={stats} />
        </section>

        <div className="zt-grid-2 zt-section">
          <section>
            <SectionLabel count={v.recentNotes.length}>Recently synced</SectionLabel>
            <Card pad={false}>
              {v.recentNotes.map((n, i, arr) => (
                <div key={n.file} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.file}</div>
                    <div className="zt-eyebrow" style={{ marginTop: 3, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>{n.kind}</div>
                  </div>
                  <span className="zt-eyebrow zt-tnum" style={{ flex: '0 0 auto' }}>{n.synced}</span>
                </div>
              ))}
            </Card>
          </section>

          <section>
            <SectionLabel count={v.targets.length}>Metric targets</SectionLabel>
            <Card pad={false}>
              {v.targets.map((t, i, arr) => (
                <Link key={t.metricId} to={'/metrics/' + t.catId + '/' + t.metricId}>
                  <div className="zt-mrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)' }}>{t.metric}</div>
                      <div className="zt-eyebrow" style={{ marginTop: 3, letterSpacing: '0.06em' }}>→ {t.catId}/{t.metricId}</div>
                    </div>
                    <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: '0 0 auto' }}>{t.target}</span>
                    <Icon name="chevron-right" size={16} stroke={1.5} color="var(--text-faint)" />
                  </div>
                </Link>
              ))}
            </Card>
          </section>
        </div>

        <TrustNote right={<button type="button" className="zt-pill" style={{ color: 'var(--text-muted)' }}>Disconnect</button>}>
          The vault is a trusted source — notes and targets sync directly on schedule. Owner targets may differ from the optimal band; both render on the metric screens.
        </TrustNote>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Settings (/settings) — round 5: invites flow.
   Invite list (email · role · status · revoke) with an INLINE
   expanding create row at the top (owner pick). Two roles:
   viewer + clinician. Revoke maps to the action route
   /settings/invites/:inviteId/revoke.
   ============================================================ */
function RoleChip({ role, accent = false }) {
  return (
    <span style={{ padding: '4px 11px', background: accent ? 'var(--focus-50)' : 'var(--surface-sunken)', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: accent ? 'var(--accent)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-block', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{role}</span>
  );
}

function SettingsScreen({ path }) {
  const [, force] = useState(0);
  const invites = window.ZD.invites;
  const roles = window.ZD.inviteRoles;
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  const valid = /.+@.+\..+/.test(email.trim());
  const send = () => {
    if (!valid) return;
    invites.unshift({ id: 'inv-' + Date.now(), email: email.trim(), role, status: 'pending', sent: 'today' });
    setEmail(''); setRole('viewer'); setAdding(false); force(n => n + 1);
  };
  /* maps to the action route /settings/invites/:inviteId/revoke */
  const revoke = (id) => {
    const i = invites.findIndex(x => x.id === id);
    if (i > -1) invites.splice(i, 1);
    force(n => n + 1);
  };

  return (
    <AppShell path={path}>
      <div data-screen-label="Settings">
        <PageHeader eyebrow="Account" title="Settings" />
        <div className="zt-settings-grid">
          <section>
            <SectionLabel>Account</SectionLabel>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="zn-avatar" style={{ width: 48, height: 48, fontSize: 'var(--text-lg)' }}>M</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Owner</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>owner@example.com</div>
                </div>
                <RoleChip role="Owner" accent />
              </div>
            </Card>
          </section>

          <section>
            <SectionLabel count={invites.length}>Invites</SectionLabel>
            <Card pad={false}>
              {/* inline expanding create row (owner pick, round 5) */}
              {adding ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-md)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <input className="zt-fedit" type="email" placeholder="email@example.com" autoFocus value={email}
                    style={{ flex: '1 1 160px', minWidth: 0, width: 'auto', textAlign: 'left', fontSize: 'var(--text-xs)' }}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setAdding(false); }} />
                  <span style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                    {roles.map(r => (
                      <button key={r.id} type="button" className={'zt-pill' + (role === r.id ? ' is-active' : '')}
                        style={{ padding: '4px 11px' }} title={r.desc} onClick={() => setRole(r.id)}>{r.label}</button>
                    ))}
                  </span>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center', flex: '0 0 auto' }}>
                    <button type="button" className="zt-btn-ink" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)' }} disabled={!valid} onClick={send}>Send invite</button>
                    <button type="button" className="zt-fact" title="Cancel" onClick={() => setAdding(false)}><Icon name="x" size={14} stroke={2} /></button>
                  </span>
                </div>
              ) : (
                <button type="button" className="zt-mrow" onClick={() => setAdding(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', borderBottom: invites.length ? '1px solid var(--border)' : 'none', padding: 'var(--gap-row) var(--gap-card)', background: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                  <Icon name="plus" size={16} stroke={2} color="var(--accent)" />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--accent)' }}>Invite by email</span>
                </button>
              )}

              {invites.length === 0 ? (
                <div style={{ padding: 'var(--gap-lg) var(--gap-card)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No invitations yet.</div>
              ) : invites.map((inv, i) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-md)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: i < invites.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                    <div className="zt-eyebrow" style={{ marginTop: 3, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>{inv.status} · sent {inv.sent}</div>
                  </div>
                  <RoleChip role={inv.role} />
                  <button type="button" className="zt-fact" title={'Revoke (maps to /settings/invites/' + inv.id + '/revoke)'}
                    style={{ '--fact': 'var(--deficient)', '--fact-bg': 'var(--deficient-bg)' }} onClick={() => revoke(inv.id)}>
                    <Icon name="x" size={15} stroke={2.2} />
                  </button>
                </div>
              ))}
            </Card>
            <div style={{ marginTop: 'var(--gap-md)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textWrap: 'pretty' }}>
              {roles.map(r => r.label + ' — ' + r.desc.toLowerCase()).join(' · ')}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* ---- exports (override round-3 shallow states) --------------- */
Object.assign(window, { WhoopScreen, VaultScreen, SettingsScreen });
