/**
 * index.tsx — Reports list page (/reports)
 *
 * Shows all reports for the owner subject. Empty state links to /reports/generate.
 * assertSubjectAccess ensures tenant-scoping (D-18).
 */

import { Link } from "react-router";
import type { Route } from "./+types/index";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getOwnerSubject, getReports } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { KGradeBadge } from "~/components/ui/KGradeBadge";
import type { KLevel } from "~/components/ui/KGradeBadge";
import type { ReportSnapshot, GradedRecommendation } from "~/types/report";

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Reports - Zoetrop" },
    { name: "description", content: "Confidence-graded protocol reports" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const reportsData = await getReports(ctx);
  return { reports: reportsData };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Count recommendations per K-level from a snapshot */
function kBreakdown(
  snapshot: ReportSnapshot
): Partial<Record<KLevel, number>> {
  const counts: Partial<Record<KLevel, number>> = {};
  for (const rec of (snapshot.recommendations ?? []) as GradedRecommendation[]) {
    const k = rec.evidenceTier.toUpperCase() as KLevel;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Reports({ loaderData }: Route.ComponentProps) {
  const { reports } = loaderData;

  return (
    <div>
      <PageHeader
        eyebrow="REPORTS"
        title="Reports"
        sub="Confidence-graded protocol recommendations generated from your committed data."
      />

      {reports.length === 0 ? (
        /* Empty state */
        <Card padding="lg" style={{ textAlign: "center", marginTop: "var(--gap-lg)" }}>
          <div
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--ink)",
            }}
          >
            No reports yet
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-base)",
              margin: "0 0 24px",
              maxWidth: 440,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Generate your first report to see a confidence-graded protocol
            recommendation.
          </p>
          <Link
            to="/reports/generate"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              padding: "0 20px",
              background: "var(--accent)",
              color: "var(--accent-on, #fff)",
              border: "1.5px solid transparent",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              borderRadius: "var(--radius-pill)",
              textDecoration: "none",
            }}
          >
            Generate report
          </Link>
        </Card>
      ) : (
        /* Report list */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reports.map((report) => {
            const snapshot = report.snapshot as unknown as ReportSnapshot;
            const generatedDate = report.createdAt
              ? new Date(report.createdAt as string | Date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—";
            const counts = kBreakdown(snapshot);
            const kLevels: KLevel[] = ["K1", "K2", "K3", "K4"];

            return (
              <Card
                key={report.id}
                padding="md"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  {/* Date */}
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      marginBottom: 8,
                    }}
                  >
                    {generatedDate}
                  </div>

                  {/* K breakdown chips */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {kLevels.map((k) => {
                      const count = counts[k];
                      if (!count) return null;
                      return (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <KGradeBadge level={k} variant="chip" />
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-xs)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                    {snapshot.recommendations?.length === 0 && (
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                        }}
                      >
                        No findings
                      </span>
                    )}
                  </div>
                </div>

                {/* View link */}
                <Link
                  to={`/reports/${report.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 44,
                    padding: "0 20px",
                    fontFamily: "var(--font-text)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    borderRadius: "var(--radius-pill)",
                    color: "var(--text)",
                    textDecoration: "none",
                    border: "1.5px solid var(--border-strong)",
                    background: "var(--surface)",
                  }}
                >
                  View
                </Link>
              </Card>
            );
          })}

          {/* Generate another */}
          <div style={{ marginTop: 8 }}>
            <Link
              to="/reports/generate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 44,
                padding: "0 20px",
                fontFamily: "var(--font-text)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                borderRadius: "var(--radius-pill)",
                color: "var(--text)",
                textDecoration: "none",
                border: "1.5px solid var(--border-strong)",
                background: "var(--surface)",
              }}
            >
              Generate report
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
