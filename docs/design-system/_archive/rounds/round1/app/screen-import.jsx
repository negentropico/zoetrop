/* Screen 08 — Import · WHOOP (ancestor of the Phase 5 lab-ingest review UI) */
const ID = window.ZoetropDesignSystem_48aebc;

function ImportTabs({ active, onChange }) {
  const tabs = [['overview', 'Overview'], ['whoop', 'WHOOP'], ['vault', 'Vault']];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 'var(--gap-2xl)', overflowX: 'auto' }}>
      {tabs.map(([id, label]) => {
        const on = id === active;
        return <button key={id} onClick={() => onChange(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', marginBottom: -1, fontFamily: 'var(--font-text)', fontWeight: on ? 600 : 500, fontSize: 'var(--text-base)', color: on ? 'var(--ink)' : 'var(--text-muted)', borderBottom: '2px solid ' + (on ? 'var(--ink)' : 'transparent') }}>{label}</button>;
      })}
    </div>
  );
}

function Dropzone({ file, drag, setDrag, onFile }) {
  const inputRef = useRef(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile({ name: f.name, size: f.size }); }}
      onClick={() => inputRef.current && inputRef.current.click()}
      style={{
        border: '1.5px dashed ' + (drag ? 'var(--accent)' : 'var(--border-strong)'),
        background: drag ? 'var(--focus-50)' : 'var(--surface-2)',
        borderRadius: 'var(--radius-lg)', padding: '44px 24px', textAlign: 'center', cursor: 'pointer',
        transition: 'all var(--dur-base) var(--ease-out)',
      }}>
      <input ref={inputRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files[0]; if (f) onFile({ name: f.name, size: f.size }); }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 'var(--radius-md)', background: drag ? 'var(--focus-100)' : 'var(--surface-sunken)', color: drag ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 16 }}>
        <Icon name={drag ? 'file-json' : 'upload'} size={26} stroke={1.8} />
      </div>
      <div style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--text-md)', fontWeight: 500 }}>Drag and drop your WHOOP JSON here</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '6px 0 16px' }}>or</div>
      <ID.Button variant="secondary" size="sm">Browse files</ID.Button>
    </div>
  );
}

function ReviewField({ name, value, confidence, warn }) {
  const tone = confidence === 'low' ? 'energy' : 'vital';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)' }}>{value}</span>
          <ID.Badge tone={tone}>{confidence === 'low' ? 'low · K3' : 'high'}</ID.Badge>
        </div>
        {warn && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--warning)', fontSize: 'var(--text-xs)' }}><Icon name="triangle-alert" size={13} color="var(--warning)" />{warn}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <ID.IconButton label="Approve" variant="ghost"><Icon name="check" size={17} color="var(--vital-500)" /></ID.IconButton>
        <ID.IconButton label="Edit" variant="ghost"><Icon name="pencil" size={16} color="var(--text-muted)" /></ID.IconButton>
        <ID.IconButton label="Reject" variant="ghost"><Icon name="x" size={17} color="var(--danger)" /></ID.IconButton>
      </div>
    </div>
  );
}

function ImportScreen({ path }) {
  const { isMobile } = useViewport();
  const [tab, setTab] = useState('whoop');
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  const parse = () => { setParsing(true); setTimeout(() => { setParsing(false); setParsed(true); }, 1200); };
  const reset = () => { setFile(null); setParsed(false); };

  return (
    <AppShell path={path} wide>
      <PageHeader eyebrow="Import" title="Import data" sub="Bring in your signals from WHOOP, bloodwork, and vault files." />
      <ImportTabs active={tab} onChange={setTab} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 'var(--gap-xl)', alignItems: 'start' }}>
        <div>
          <ZCard padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
            <SectionLabel>WHOOP analyzer export</SectionLabel>
            <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Upload your <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'var(--surface-sunken)', padding: '2px 7px', borderRadius: 6 }}>whoop_analysis_report.json</code> and we'll read the latest frame.</p>

            {!file && <Dropzone file={file} drag={drag} setDrag={setDrag} onFile={setFile} />}

            {file && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--focus-50)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name="file-json" size={22} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'ready'}</div>
                </div>
                <ID.IconButton label="Remove" variant="ghost" onClick={reset}><Icon name="x" size={18} color="var(--text-muted)" /></ID.IconButton>
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <ID.Button variant="primary" fullWidth disabled={!file || parsing || parsed} onClick={parse} iconLeft={parsing ? <Icon name="loader-circle" size={18} /> : null}>
                {parsing ? 'Parsing…' : parsed ? 'Parsed' : 'Parse WHOOP data'}
              </ID.Button>
            </div>
          </ZCard>

          {parsed && (
            <ZCard accent="vital" padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--vital)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={16} stroke={2.6} /></span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>10 metrics read from your frame</span>
              </div>
              <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Captured Jan 15, 2026. Review the preview, then save to your tracker.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                {[['10', 'metrics'], ['4', 'autonomic'], ['0', 'flagged']].map(([v, l]) => (
                  <div key={l} style={{ flex: 1, minWidth: 90, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span className="zt-readout" style={{ fontSize: 'var(--text-xl)' }}>{v}</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {ZD.whoopPreview.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>{p.name}</span>
                    <span className="zt-tnum" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                <ID.Button variant="primary" iconLeft={<Icon name="database" size={17} />}>Save to tracker</ID.Button>
                <ID.Button variant="ghost" onClick={reset}>Discard</ID.Button>
              </div>
            </ZCard>
          )}
        </div>

        <div>
          <ZCard padding="lg" style={{ marginBottom: 'var(--gap-lg)' }}>
            <SectionLabel>How to export from WHOOP</SectionLabel>
            <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
              <li>Run the WHOOP Analyzer on your data export.</li>
              <li>Locate the generated <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>whoop_analysis_report.json</code>.</li>
              <li>Upload it using the form.</li>
              <li>Review the parsed metrics and save.</li>
            </ol>
            <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Default path <span style={{ background: 'var(--surface-sunken)', padding: '3px 7px', borderRadius: 6, color: 'var(--text-secondary)' }}>~/Code/Whoop/results/</span>
            </div>
          </ZCard>

          {/* Phase 5 forward-looking sketch */}
          <ZCard padding="lg" tone="focus">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ID.Badge tone="focus" variant="solid">Phase 5</ID.Badge>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Lab ingest review</span>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>The same upload → parse → review → commit flow, scaled to lab PDFs: source on the left, extracted fields to approve on the right.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 12 }}>
              {/* faux source doc */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, minHeight: 160 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>labcorp_2026.pdf</div>
                {[70, 92, 60, 84].map((w, i) => <div key={i} style={{ height: 6, width: w + '%', background: 'var(--surface-sunken)', borderRadius: 3, margin: '7px 0' }} />)}
                <div style={{ height: 12, width: '54%', background: 'var(--energy-100)', borderRadius: 3, margin: '10px 0', border: '1px solid var(--energy-300)' }} />
                {[88, 64].map((w, i) => <div key={i} style={{ height: 6, width: w + '%', background: 'var(--surface-sunken)', borderRadius: 3, margin: '7px 0' }} />)}
              </div>
              {/* extracted fields */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px 14px' }}>
                <ReviewField name="hs-CRP" value="0.8 mg/L" confidence="high" />
                <ReviewField name="Homocysteine" value="9.4 µmol/L" confidence="low" warn="Above optimal (7) — verify" />
              </div>
            </div>
          </ZCard>
        </div>
      </div>
    </AppShell>
  );
}
window.ImportScreen = ImportScreen;
