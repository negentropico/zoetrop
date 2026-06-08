import { Link } from "react-router";
import type { Route } from "./+types/index";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Import data - Zoetrop" },
    { name: "description", content: "Import wellness data from various sources" },
  ];
}

const importSources = [
  {
    id: "whoop",
    name: "WHOOP",
    description:
      "Import HRV, recovery, sleep, and strain data from WHOOP Analyzer JSON exports",
    href: "/import/whoop",
    formats: ["JSON (whoop_analysis_report.json)"],
    metrics: ["HRV (RMSSD)", "Recovery Score", "Resting Heart Rate", "Sleep Performance", "TDEE"],
    available: true,
  },
  {
    id: "vault",
    name: "Obsidian Vault",
    description:
      "Import bloodwork and protocol data from vault markdown files",
    href: "/import/vault",
    formats: ["Markdown (.md)", "Tables"],
    metrics: ["Bloodwork results", "Supplement protocols", "Historical data"],
    available: true,
  },
  {
    id: "csv",
    name: "CSV",
    description:
      "Import data from CSV files with custom column mapping",
    href: "/import/csv",
    formats: ["CSV", "TSV"],
    metrics: ["Custom metrics"],
    available: false,
  },
];

export default function ImportIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="IMPORT"
        title="Import data"
        sub="Bring in your signals from WHOOP, bloodwork, and vault files."
      />

      {/* Source cards */}
      <div className="zt-grid-2" style={{ marginBottom: "var(--gap-xl)" }}>
        {importSources.map((source) => (
          <Card
            key={source.id}
            padding="lg"
            elevation="sm"
            style={{ opacity: source.available ? 1 : 0.5 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div className="zt-eyebrow">{source.name}</div>
              {!source.available && (
                <Badge tone="neutral">Coming soon</Badge>
              )}
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                margin: "0 0 16px",
              }}
            >
              {source.description}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ fontWeight: 700 }}>Formats:</span>{" "}
                {source.formats.join(", ")}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ fontWeight: 700 }}>Metrics:</span>{" "}
                {source.metrics.join(", ")}
              </div>
            </div>
            {source.available && (
              <Link to={source.href}>
                <Button variant="primary" size="sm">
                  Import from {source.name}
                </Button>
              </Link>
            )}
          </Card>
        ))}
      </div>

      {/* Recent imports */}
      <Card padding="lg">
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-lg)" }}>
          Recent imports
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "var(--gap-3xl) 0",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Nothing logged yet. Your first frame starts when you begin.
        </div>
      </Card>
    </div>
  );
}
