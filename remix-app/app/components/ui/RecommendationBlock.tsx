// RecommendationBlock — per-finding recommendation card.
// Assembles the LOCKED "K{N} ({label}): {text}" inline body (UI-SPEC Pattern 2).
// Header: KGradeBadge chip + source name + StatusBadge (metric) or SubBadge (variant).
// Renders DisclaimerCallout only when kLevel === 'K4'.

import { ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { DisclaimerCallout } from "./DisclaimerCallout";
import { KGradeBadge, type KLevel } from "./KGradeBadge";
import { StatusBadge, type Status } from "./StatusBadge";
import { CONFIDENCE_LEVELS } from "~/types/genetics";

export interface RecommendationBlockProps {
  kLevel: KLevel;
  /** The corpus recommendation text — no template prefix (UI assembles K{N} ({label}): ) */
  recommendationText: string;
  source: "metric" | "variant";
  // For metric-sourced recommendations:
  metricName?: string;
  metricStatus?: Status;
  // For variant-sourced recommendations:
  geneName?: string;
  genotype?: string;
  // Secondary detection-confidence annotation (D-09) — variant source only:
  detectionConfidence?: "verified" | "inferred";
}

export function RecommendationBlock({
  kLevel,
  recommendationText,
  source,
  metricName,
  metricStatus,
  geneName,
  genotype,
  detectionConfidence,
}: RecommendationBlockProps) {
  const cfg = CONFIDENCE_LEVELS[kLevel];
  const label = cfg?.label ?? kLevel;

  // Source name: metric name or "{gene} ({genotype})"
  const sourceName =
    source === "metric"
      ? metricName
      : geneName && genotype
        ? `${geneName} (${genotype})`
        : geneName ?? "";

  return (
    <Card elevation="xs" padding="md" tone={kLevel === "K4" ? "mist" : null}>
      {/* Header row: KGradeBadge chip + source name + StatusBadge (metric only) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <KGradeBadge level={kLevel} variant="chip" />
        {sourceName && (
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {sourceName}
          </span>
        )}
        {source === "metric" && metricStatus && (
          <StatusBadge status={metricStatus} />
        )}
      </div>

      {/* SubBadge row (variant only) — D-09 detection-confidence secondary annotation */}
      {source === "variant" && detectionConfidence !== undefined && (
        <div style={{ marginBottom: 8 }}>
          {detectionConfidence === "verified" ? (
            <Badge tone="vital" variant="soft">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={12} aria-hidden="true" />
                VERIFIED
              </span>
            </Badge>
          ) : (
            <Badge tone="neutral" variant="outline">
              INFERRED
            </Badge>
          )}
        </div>
      )}

      {/* Body — LOCKED inline flow: K{N} (label): {recommendationText} */}
      <div style={{ lineHeight: 1.5 }}>
        <KGradeBadge level={kLevel} variant="inline" />
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-muted)",
            marginLeft: 3,
          }}
        >
          ({label})
        </span>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-base)",
          }}
        >
          {": "}
        </span>
        <span
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-base)",
            color: "var(--ink)",
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {recommendationText}
        </span>
      </div>

      {/* DisclaimerCallout — K4 only */}
      {kLevel === "K4" && <DisclaimerCallout />}
    </Card>
  );
}
