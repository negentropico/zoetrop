/* ============================================================
   Zoetrop — round 3 prototype entry point
   Hash router → screens (all loaded from screens.jsx via window)
   ============================================================ */

function Placeholder({ path, title }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="Coming soon" title={title || 'Screen'} sub="This screen is not yet authored in the prototype." />
    </AppShell>
  );
}

function App() {
  const path = useRoute();
  const seg = path.replace(/\/+$/, '').split('/').filter(Boolean);

  let screen;

  /* Dashboard */
  if (path === '/' || path === '/dashboard' || seg.length === 0) {
    screen = <DashboardScreen path={path} />;

  /* Metrics */
  } else if (seg[0] === 'metrics') {
    if (seg.length === 1) {
      screen = <MetricsScreen path={path} />;
    } else if (seg.length === 2) {
      screen = <CategoryScreen path={path} catId={seg[1]} />;
    } else {
      screen = <DetailScreen path={path} catId={seg[1]} metricId={seg[2]} />;
    }

  /* Protocol */
  } else if (seg[0] === 'protocol') {
    if (!seg[1] || seg[1] === 'index') {
      screen = <ProtocolScreen path={path} />;
    } else if (seg[1] === 'versions') {
      screen = <VersionsScreen path={path} />;
    } else if (seg[1] === 'supplements') {
      screen = <SupplementsScreen path={path} />;
    } else if (seg[1] === 'cessation') {
      screen = <CessationScreen path={path} />;
    } else if (seg[1] === 'compare') {
      screen = <CompareScreen path={path} />;
    } else {
      screen = <ProtocolScreen path={path} />;
    }

  /* Insights */
  } else if (seg[0] === 'insights') {
    if (!seg[1] || seg[1] === 'index') {
      screen = <InsightsScreen path={path} />;
    } else if (seg[1] === 'correlations') {
      screen = <CorrelationsScreen path={path} />;
    } else if (seg[1] === 'genetics') {
      screen = <GeneticsScreen path={path} />;
    } else {
      screen = <InsightsScreen path={path} />;
    }

  /* Import */
  } else if (seg[0] === 'import') {
    if (!seg[1] || seg[1] === 'index') {
      screen = <ImportScreen path={path} />;
    } else if (seg[1] === 'whoop') {
      screen = <WhoopScreen path={path} />;
    } else if (seg[1] === 'vault') {
      screen = <VaultScreen path={path} />;
    } else {
      screen = <ImportScreen path={path} />;
    }

  /* Ingest */
  } else if (seg[0] === 'ingest') {
    if (!seg[1] || seg[1] === 'index') {
      screen = <IngestScreen path={path} />;
    } else if (seg[1] === 'upload') {
      screen = <IngestUploadScreen path={path} />;
    } else if (seg[1] === 'review') {
      screen = <IngestReviewScreen path={path} />;
    } else {
      screen = <IngestScreen path={path} />;
    }

  /* Settings */
  } else if (seg[0] === 'settings') {
    screen = <SettingsScreen path={path} />;

  /* Fallback */
  } else {
    screen = <DashboardScreen path={path} />;
  }

  return screen;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
