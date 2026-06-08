/* Router + mount */
function Placeholder({ path, title }) {
  return (
    <AppShell path={path}>
      <PageHeader eyebrow="In progress" title={title || 'Screen'} sub="This frame is being composed." />
    </AppShell>
  );
}

function App() {
  const path = useRoute();
  const seg = path.replace(/\/+$/, '').split('/').filter(Boolean); // ['metrics','autonomic']

  let screen;
  if (path === '/' || seg.length === 0) {
    screen = <DashboardScreen path={path} />;
  } else if (seg[0] === 'metrics') {
    if (seg.length === 1) screen = <MetricsScreen path={path} />;
    else if (seg.length === 2) screen = <CategoryScreen path={path} catId={seg[1]} />;
    else screen = <DetailScreen path={path} catId={seg[1]} metricId={seg[2]} />;
  } else if (seg[0] === 'protocol') {
    if (seg[1] === 'cessation') screen = <CessationScreen path={path} />;
    else screen = <ProtocolScreen path={path} tab={seg[1] || 'overview'} />;
  } else if (seg[0] === 'insights') {
    screen = <CorrelationsScreen path={path} />;
  } else if (seg[0] === 'import') {
    screen = <ImportScreen path={path} />;
  } else if (seg[0] === 'about') {
    screen = <AboutScreen path={path} />;
  } else {
    screen = <DashboardScreen path={path} />;
  }
  // graceful fallback if a screen file hasn't loaded
  const wrap = (name, el) => (typeof window[name] === 'function' ? el : <Placeholder path={path} title={name} />);
  return screen;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
