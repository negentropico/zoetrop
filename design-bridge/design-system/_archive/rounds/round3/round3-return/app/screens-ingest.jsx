/* ============================================================
   Zoetrop — round 4: Ingest flow screens
   /ingest/review (populated), /ingest/consent, /ingest/documents/:id
   Loaded AFTER screens.jsx — IngestReviewScreen here replaces the
   round-3 empty-state placeholder (kept there for reference).

   Review model: per-field decision (approve / edit / reject)
   through the canonical status tokens —
     approved → optimal · edited → borderline · rejected → deficient
     pending  → neutral structure (no judgment yet)
   Decisions live in window.ZD.reviewState so the gate count on
   /ingest stays live as you review (in-memory, design artifact).
   ============================================================ */

/* ---- shared review-state store ------------------------------ */
function reviewStateOf(docId) {
  const ZD = window.ZD;
  if (!ZD.reviewState) ZD.reviewState = {};
  if (!ZD.reviewState[docId]) {
    const seed = {};
    (ZD.extractions[docId] || []).forEach(f => { seed[f.id] = { state: 'pending', value: f.value }; });
    /* round 5 (closing): the review-only seeded mid-review state
       was stripped — a fresh document starts all-pending, which
       is the real post-extraction behavior. */
    ZD.reviewState[docId] = seed;
  }
  return ZD.reviewState[docId];
}
function reviewCounts(docId) {
  const rs = reviewStateOf(docId);
  const c = { approved: 0, edited: 0, rejected: 0, pending: 0, total: 0 };
  Object.values(rs).forEach(v => { c[v.state] = (c[v.state] || 0) + 1; c.total++; });
  return c;
}
/* decision → canonical status token mapping */
const DECISION = {
  approved: { word: 'approved', color: 'var(--optimal)',    bg: 'var(--optimal-bg)',    icon: 'check' },
  edited:   { word: 'edited',   color: 'var(--borderline)', bg: 'var(--borderline-bg)', icon: 'pencil' },
  rejected: { word: 'rejected', color: 'var(--deficient)',  bg: 'var(--deficient-bg)',  icon: 'x' },
  pending:  { word: 'pending',  color: 'var(--text-faint)', bg: 'transparent',          icon: 'circle-dashed' },
};

/* ============================================================
   DocPanel — calm lab-report facsimile (not a real PDF render).
   Mono lines on a raised page; the selected extraction's source
   line is highlighted in the accent wash.
   ============================================================ */
function DocPanel({ docId, page, onPage, highlight, minHeight = 420 }) {
  const pages = (window.ZD.docPages[docId]) || [];
  const pg = pages[page] || pages[0];
  if (!pg) return <ChartEmpty height={minHeight} title="No document" body="Nothing to display." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight }}>
      <div className="zt-docpage" style={{ flex: 1 }}>
        <div className="zt-eyebrow" style={{ marginBottom: 'var(--gap-lg)', color: 'var(--text-faint)' }}>{pg.header}</div>
        <div>
          {pg.lines.map((ln, i) => {
            const hot = highlight && highlight.page === page + 1 && highlight.line === i;
            return (
              <div key={i} className={'zt-docline' + (hot ? ' is-hot' : '')}>{ln || '\u00A0'}</div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--gap-lg)', paddingTop: 'var(--gap-md)' }}>
        <button type="button" className="zt-pill" style={{ padding: '4px 10px' }} disabled={page === 0}
          onClick={() => onPage(Math.max(0, page - 1))} aria-label="Previous page">
          <Icon name="chevron-left" size={13} stroke={2} />
        </button>
        <span className="zt-eyebrow zt-tnum">Page {page + 1} / {pages.length}</span>
        <button type="button" className="zt-pill" style={{ padding: '4px 10px' }} disabled={page === pages.length - 1}
          onClick={() => onPage(Math.min(pages.length - 1, page + 1))} aria-label="Next page">
          <Icon name="chevron-right" size={13} stroke={2} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   FieldRow — one extraction: decision edge, mapping, mono value,
   confidence readout, approve / edit / reject actions.
   ============================================================ */
function FieldRow({ f, entry, selected, onSelect, onDecide, onEditValue, last }) {
  const d = DECISION[entry.state];
  const lowConf = f.conf < 0.8;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(entry.value));

  const act = (e, state) => { e.stopPropagation(); setEditing(false); onDecide(f.id, state); };
  const startEdit = (e) => { e.stopPropagation(); setDraft(String(entry.value)); setEditing(true); onSelect(f); };
  const commitEdit = (e) => {
    e.stopPropagation();
    const v = parseFloat(draft);
    if (!isNaN(v)) onEditValue(f.id, v);
    setEditing(false);
  };

  return (
    <div className={'zt-frow' + (selected ? ' is-selected' : '')} onClick={() => onSelect(f)}
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span className="zt-frow-edge" style={{ background: entry.state === 'pending' ? 'var(--n-200)' : d.color }}></span>

      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: entry.state === 'rejected' ? 'var(--text-muted)' : 'var(--text)', textDecoration: entry.state === 'rejected' ? 'line-through' : 'none' }}>{f.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span className="zt-eyebrow" style={{ letterSpacing: '0.06em' }}>→ {f.catId}/{f.metricId}</span>
          <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: lowConf ? 'var(--borderline)' : 'var(--text-faint)', letterSpacing: '0.06em' }}>
            CONF {f.conf.toFixed(2)}{lowConf ? ' · CHECK SOURCE' : ''}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 84 }}>
        {editing ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
            <input className="zt-fedit zt-tnum" type="number" value={draft} autoFocus
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(e); if (e.key === 'Escape') setEditing(false); }} />
            <button type="button" className="zt-fact" title="Save value" onClick={commitEdit}
              style={{ color: 'var(--borderline)' }}><Icon name="check" size={14} stroke={2.2} /></button>
          </span>
        ) : (
          <>
            <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: entry.state === 'rejected' ? 'var(--text-faint)' : 'var(--ink)' }}>
              {entry.value}{entry.state === 'edited' && <span title={'extracted ' + f.value} style={{ color: 'var(--borderline)' }}>*</span>}
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{f.unit}</div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
        <button type="button" className={'zt-fact' + (entry.state === 'approved' ? ' is-on' : '')} title="Approve"
          style={{ '--fact': 'var(--optimal)', '--fact-bg': 'var(--optimal-bg)' }} onClick={e => act(e, 'approved')}>
          <Icon name="check" size={15} stroke={2.2} />
        </button>
        <button type="button" className={'zt-fact' + (entry.state === 'edited' ? ' is-on' : '')} title="Edit value"
          style={{ '--fact': 'var(--borderline)', '--fact-bg': 'var(--borderline-bg)' }} onClick={startEdit}>
          <Icon name="pencil" size={14} stroke={2} />
        </button>
        <button type="button" className={'zt-fact' + (entry.state === 'rejected' ? ' is-on' : '')} title="Reject"
          style={{ '--fact': 'var(--deficient)', '--fact-bg': 'var(--deficient-bg)' }} onClick={e => act(e, 'rejected')}>
          <Icon name="x" size={15} stroke={2.2} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Ingest review (/ingest/review) — populated state
   Desktop: split view (document left, fields right).
   Mobile (≤760): Document / Fields segmented toggle — both
   panels at full fidelity, one at a time.
   ============================================================ */
function IngestReviewScreen({ path }) {
  const doc = window.ZD.ingest.documents[0];
  const fields = window.ZD.extractions[doc.id] || [];
  const [, force] = useState(0);
  const rs = reviewStateOf(doc.id);
  const counts = reviewCounts(doc.id);
  const writable = counts.approved + counts.edited;

  const [selId, setSelId] = useState(fields[0] ? fields[0].id : null);
  const sel = fields.find(f => f.id === selId) || null;
  const [page, setPage] = useState(sel ? sel.page - 1 : 0);
  const { isMobile } = useViewport();
  const [tab, setTab] = useState('fields');

  const onSelect = (f) => { setSelId(f.id); setPage(f.page - 1); };
  const onDecide = (id, state) => {
    rs[id].state = rs[id].state === state ? 'pending' : state;
    if (rs[id].state !== 'edited') rs[id].value = fields.find(f => f.id === id).value;
    force(n => n + 1);
  };
  const onEditValue = (id, v) => { rs[id].value = v; rs[id].state = 'edited'; force(n => n + 1); };

  const progress = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-lg)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <span style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', textTransform: 'uppercase' }} className="zt-tnum">
        <span style={{ color: 'var(--optimal)' }}>✓ {counts.approved}</span>
        <span style={{ color: 'var(--borderline)' }}>~ {counts.edited}</span>
        <span style={{ color: 'var(--deficient)' }}>× {counts.rejected}</span>
        <span style={{ color: 'var(--text-muted)' }}>· {counts.pending} pending</span>
      </span>
      <button type="button" className="zt-btn-ink" disabled={counts.pending > 0 || writable === 0}
        title={counts.pending > 0 ? 'Decide every field first' : undefined}>
        Write {writable} to metrics
      </button>
    </div>
  );

  const docPanel = (
    <Card pad={false} style={{ padding: 'var(--gap-card)' }}>
      <DocPanel docId={doc.id} page={page} onPage={setPage}
        highlight={sel && !isMobile ? { page: sel.page, line: sel.line } : sel ? { page: sel.page, line: sel.line } : null} />
    </Card>
  );
  const fieldsPanel = (
    <Card pad={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gap-lg)', padding: 'var(--gap-row) var(--gap-card)', borderBottom: '1px solid var(--border)' }}>
        <span className="zt-eyebrow">{doc.filename}</span>
        <span className="zt-eyebrow zt-tnum">{counts.total} fields · {doc.source} · {doc.drawDate}</span>
      </div>
      {fields.map((f, i) => (
        <FieldRow key={f.id} f={f} entry={rs[f.id]} selected={selId === f.id} last={i === fields.length - 1}
          onSelect={onSelect} onDecide={onDecide} onEditValue={onEditValue} />
      ))}
    </Card>
  );

  return (
    <AppShell path={path}>
      <div data-screen-label="Ingest review">
        <PageHeader
          crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Review' }]}
          title="Review extractions"
          right={progress}
        />
        {isMobile && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--gap-lg)' }}>
            {['fields', 'document'].map(t => (
              <button key={t} type="button" className={'zt-pill' + (tab === t ? ' is-active' : '')} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        )}
        {isMobile ? (tab === 'document' ? docPanel : fieldsPanel) : (
          <div className="zt-review-grid">
            {docPanel}
            {fieldsPanel}
          </div>
        )}
        <div style={{ marginTop: 'var(--gap-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--gap-lg)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Approved and edited values write to your metrics; rejected fields are dropped. Nothing is written until every field is decided.</span>
          <Link to={'/ingest/documents/' + doc.id} className="zt-link">Open document <Icon name="arrow-right" size={14} stroke={2} /></Link>
        </div>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Consent gate (/ingest/consent)
   ============================================================ */
function IngestConsentScreen({ path }) {
  const [agree, setAgree] = useState(false);
  const terms = [
    { icon: 'file-search', text: 'The document is read by an AI extraction model to lift test names, values and units.' },
    { icon: 'clipboard-check', text: 'Nothing is written to your metrics until you approve each field in review.' },
    { icon: 'archive', text: 'The original PDF is stored unmodified; consent is per-document and revocable.' },
  ];
  return (
    <AppShell path={path}>
      <div data-screen-label="Ingest consent">
        <PageHeader
          crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Consent' }]}
          title="Before this document is read"
          sub="One quiet decision, per document"
        />
        <div style={{ maxWidth: 620 }}>
          <Card>
            {terms.map((t, i) => (
              <div key={t.icon} style={{ display: 'flex', gap: 'var(--gap-lg)', alignItems: 'flex-start', padding: 'var(--gap-md) 0', borderBottom: i < terms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <IconTile name={t.icon} size={34} />
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textWrap: 'pretty', paddingTop: 6 }}>{t.text}</p>
              </div>
            ))}
            <button type="button" className={'zt-consent-row' + (agree ? ' is-on' : '')} onClick={() => setAgree(a => !a)}>
              <span className="zt-consent-box">{agree && <Icon name="check" size={13} stroke={2.6} />}</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>I consent to AI-assisted extraction of this document</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--gap-md)', marginTop: 'var(--gap-lg)' }}>
              <Link to="/ingest" className="zt-pill" style={{ color: 'var(--text-secondary)' }}>Cancel</Link>
              <button type="button" className="zt-btn-ink" disabled={!agree} onClick={() => navigate('/ingest/upload')}>
                Continue to upload
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

/* ============================================================
   Document viewer (/ingest/documents/:id)
   ============================================================ */
function DocumentScreen({ path, docId }) {
  const doc = window.ZD.ingest.documents.find(d => d.id === docId) || window.ZD.ingest.documents[0];
  const counts = reviewCounts(doc.id);
  const [page, setPage] = useState(0);
  const meta = [
    { label: 'Source', value: doc.source },
    { label: 'Draw date', value: doc.drawDate },
    { label: 'Uploaded', value: doc.uploaded },
    { label: 'Extraction', value: counts.total + ' fields · ' + (counts.pending > 0 ? counts.pending + ' pending' : 'reviewed') },
  ];
  return (
    <AppShell path={path}>
      <div data-screen-label="Document viewer">
        <PageHeader
          crumb={[{ label: 'Ingest', to: '/ingest' }, { label: 'Documents' }, { label: doc.id }]}
          title={doc.filename}
          right={counts.pending > 0
            ? <Link to="/ingest/review" className="zt-btn-ink" style={{ textDecoration: 'none', color: 'var(--text-on-ink)' }}>Review {counts.pending} pending</Link>
            : <StatusBadge status="optimal" />}
        />
        <section className="zt-section">
          <Card>
            <div className="zt-stat-strip">
              {meta.map(s => (
                <div key={s.label} className="zt-stat">
                  <div className="zt-eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
                  <div className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
        <Card pad={false} style={{ padding: 'var(--gap-card)', maxWidth: 760 }}>
          <DocPanel docId={doc.id} page={page} onPage={setPage} highlight={null} minHeight={520} />
        </Card>
      </div>
    </AppShell>
  );
}

/* ---- exports (override round-3 placeholder) ----------------- */
Object.assign(window, {
  IngestReviewScreen, IngestConsentScreen, DocumentScreen,
  reviewCounts, reviewStateOf,
});
