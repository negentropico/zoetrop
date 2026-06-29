/* ============================================================
   Zoetrop — round 3 return: entry point
   Hash router → screens. Round-3 decisions are BAKED in
   charts.jsx + new.css; the only remaining tweak is a
   review-only chart state preview (data / empty / loading).
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "chartState": "data"
}/*EDITMODE-END*/;

function App() {
  const path = useRoute();
  const seg = path.replace(/\/+$/, '').split('/').filter(Boolean);

  let screen;

  if (path === '/') {
    screen = <LandingScreen />;
  } else if (path === '/login') {
    screen = <LoginScreen />;
  } else if (path === '/dashboard' || seg.length === 0) {
    screen = <DashboardScreen path={path} />;
  } else if (seg[0] === 'metrics') {
    if (seg.length === 1) screen = <MetricsScreen path={path} />;
    else if (seg.length === 2) screen = <CategoryScreen path={path} catId={seg[1]} />;
    else screen = <DetailScreen path={path} catId={seg[1]} metricId={seg[2]} />;
  } else if (seg[0] === 'protocol') {
    if (!seg[1] || seg[1] === 'index') screen = <ProtocolScreen path={path} />;
    else if (seg[1] === 'versions') screen = seg[2] ? <VersionDetailScreen path={path} versionId={seg[2]} /> : <VersionsScreen path={path} />;
    else if (seg[1] === 'supplements') screen = <SupplementsScreen path={path} />;
    else if (seg[1] === 'cessation') screen = <CessationScreen path={path} />;
    else if (seg[1] === 'compare') screen = <CompareScreen path={path} />;
    else screen = <ProtocolScreen path={path} />;
  } else if (seg[0] === 'insights') {
    if (!seg[1] || seg[1] === 'index') screen = <InsightsScreen path={path} />;
    else if (seg[1] === 'correlations') screen = <CorrelationsScreen path={path} />;
    else if (seg[1] === 'genetics') screen = <GeneticsScreen path={path} />;
    else screen = <InsightsScreen path={path} />;
  } else if (seg[0] === 'import') {
    /* /import/* are aliases under the combined Ingest section */
    if (seg[1] === 'whoop') screen = <WhoopScreen path={path} />;
    else if (seg[1] === 'vault') screen = <VaultScreen path={path} />;
    else screen = <IngestScreen path={path} />;
  } else if (seg[0] === 'ingest') {
    if (!seg[1] || seg[1] === 'index') screen = <IngestScreen path={path} />;
    else if (seg[1] === 'upload') screen = <IngestUploadScreen path={path} />;
    else if (seg[1] === 'review') screen = <IngestReviewScreen path={path} />;
    else if (seg[1] === 'consent') screen = <IngestConsentScreen path={path} />;
    else if (seg[1] === 'documents') screen = <DocumentScreen path={path} docId={seg[2]} />;
    else screen = <IngestScreen path={path} />;
  } else if (seg[0] === 'settings') {
    screen = <SettingsScreen path={path} />;
  } else {
    screen = <DashboardScreen path={path} />;
  }

  return screen;
}

function Root() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const chartTweaks = useMemo(() => ({ chartState: t.chartState }), [t.chartState]);

  /* round 5 (closing): the review-only window.__setTweak hook
     was stripped. */

  return (
    <ChartTweaksCtx.Provider value={chartTweaks}>
      <App />
      <TweaksPanel>
        <TweakSection label="Review" />
        <TweakRadio label="Chart state" value={t.chartState}
          options={['data', 'empty', 'loading']}
          onChange={(v) => setTweak('chartState', v)} />
      </TweaksPanel>
    </ChartTweaksCtx.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
