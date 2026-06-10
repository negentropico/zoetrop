import { Link } from "react-router";
import { Check, Play, Circle, Info, ArrowLeft } from "lucide-react";
import type { Route } from "./+types/cessation";
import { realCessationLog } from "~/lib/protocol-data";
import { CESSATION_PHASES, type CessationPhase } from "~/types/protocol";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { MetricRing } from "~/components/ui/MetricRing";
import { PhaseBar } from "~/components/ui/PhaseBar";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { Button } from "~/components/ui/Button";
import type { Phase } from "~/components/ui/PhaseBar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cessation tracker - Zoetrop" },
    { name: "description", content: "Track FAAH-based cessation protocol progress" },
  ];
}

export function loader() {
  const cessation = realCessationLog[0];

  if (!cessation) {
    return {
      active: false,
      cessation: null,
      currentDay: 0,
      currentPhase: CESSATION_PHASES[0],
      daysInPhase: 0,
      daysUntilNextPhase: 0,
      projectedCompletion: null as string | null,
      phaseProgress: [] as Array<{
        phase: CessationPhase;
        label: string;
        status: "completed" | "current" | "upcoming";
        startDay: number;
        endDay: number;
        progress: number;
      }>,
      phaseDuration: 0,
      targetDay: 150,
      startDate: null as string | null,
    };
  }

  const startDate = parseISO(cessation.startDate);
  const currentDay = differenceInDays(new Date(), startDate);
  const targetDay = 150;

  // Find current phase
  const currentPhase = CESSATION_PHASES.find(
    (p) => currentDay >= p.dayRange.start && currentDay <= p.dayRange.end
  ) || CESSATION_PHASES[CESSATION_PHASES.length - 1];

  const daysInPhase = currentDay - currentPhase.dayRange.start + 1;
  const phaseDuration = currentPhase.dayRange.end - currentPhase.dayRange.start + 1;

  // Find next phase
  const currentPhaseIndex = CESSATION_PHASES.findIndex((p) => p.phase === currentPhase.phase);
  const nextPhase = CESSATION_PHASES[currentPhaseIndex + 1];
  const daysUntilNextPhase = nextPhase ? nextPhase.dayRange.start - currentDay : 0;

  // Projected completion
  const projectedCompletion = addDays(startDate, targetDay);

  // Phase progress for visualization
  const phaseProgress = CESSATION_PHASES.map((phase) => {
    let status: "completed" | "current" | "upcoming";
    let progress = 0;

    if (currentDay > phase.dayRange.end) {
      status = "completed";
      progress = 100;
    } else if (currentDay >= phase.dayRange.start) {
      status = "current";
      const elapsed = currentDay - phase.dayRange.start + 1;
      const total = phase.dayRange.end - phase.dayRange.start + 1;
      progress = Math.round((elapsed / total) * 100);
    } else {
      status = "upcoming";
      progress = 0;
    }

    return {
      phase: phase.phase,
      label: phase.label,
      status,
      startDay: phase.dayRange.start,
      endDay: phase.dayRange.end,
      progress,
    };
  });

  return {
    active: true,
    cessation,
    currentDay,
    currentPhase,
    daysInPhase,
    daysUntilNextPhase,
    projectedCompletion: projectedCompletion.toISOString(),
    phaseProgress,
    phaseDuration,
    targetDay,
    startDate: cessation.startDate,
  };
}

// Family tints per phase (per UI-SPEC cessation phase families)
const PHASE_FAMILY: Record<CessationPhase, "energy" | "vital" | "focus" | null> = {
  acute: "energy",
  stabilization: "vital",
  clearing: "vital",
  optimization: "focus",
};

// Build PhaseBar phases from CESSATION_PHASES + current day
function buildPhaseBarPhases(currentDay: number): Phase[] {
  return CESSATION_PHASES.map((p) => {
    const days = p.dayRange.end - p.dayRange.start + 1;
    let state: Phase["state"];
    if (currentDay > p.dayRange.end) {
      state = "completed";
    } else if (currentDay >= p.dayRange.start && currentDay <= p.dayRange.end) {
      state = "current";
    } else {
      state = "upcoming";
    }
    return { id: p.phase, name: p.label, days, state };
  });
}

// Phase card — family-tinted, calm "you" voice
function PhaseCard({
  phase,
  status,
  progress,
}: {
  phase: (typeof CESSATION_PHASES)[0];
  status: "completed" | "current" | "upcoming";
  progress: number;
}) {
  const family = PHASE_FAMILY[phase.phase];
  const isCurrent = status === "current";
  const isCompleted = status === "completed";

  return (
    <Card
      padding="lg"
      tone={family ?? undefined}
      style={{
        border: isCurrent ? "2px solid var(--ink)" : "1px solid var(--border)",
        background: isCurrent ? "var(--focus-50)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: isCompleted ? "var(--vital)" : isCurrent ? "var(--ink)" : "var(--n-150)",
              color: isCompleted ? "#fff" : isCurrent ? "var(--n-50)" : "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {isCompleted ? (
              <Check size={15} strokeWidth={2.4} />
            ) : isCurrent ? (
              <Play size={15} strokeWidth={2.4} />
            ) : (
              <Circle size={15} strokeWidth={2.4} />
            )}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-lg)", color: "var(--ink)" }}>
            {phase.label}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          Days {phase.dayRange.start}–{phase.dayRange.end}
        </span>
      </div>

      <p style={{ margin: "12px 0 14px", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
        {phase.focus}
      </p>

      <ProgressBar
        value={progress}
        max={100}
        tone={family ?? "focus"}
        height={7}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
        <span>{isCompleted ? "Completed" : isCurrent ? "In progress" : "Upcoming"}</span>
        <span>{phase.dayRange.end - phase.dayRange.start + 1} days</span>
      </div>

      <p style={{ margin: "14px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        {phase.description}
      </p>
    </Card>
  );
}

// Stat tile — same ProtoStat pattern as overview
function ProtoStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card padding="md" style={{ minHeight: 104, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="zt-eyebrow">{label}</div>
      <div>
        <span className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}>
          {value}
        </span>
        {sub && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Cessation({ loaderData }: Route.ComponentProps) {
  const {
    active,
    cessation,
    currentDay,
    currentPhase,
    daysInPhase,
    daysUntilNextPhase,
    projectedCompletion,
    phaseProgress,
    phaseDuration,
    targetDay,
    startDate,
  } = loaderData;

  if (!active) {
    return (
      <div>
        <PageHeader
          eyebrow="PROTOCOL · CESSATION"
          title="Cessation tracker"
          sub="Your FAAH-informed 150-day protocol, one phase at a time."
        />
        <Card padding="lg" style={{ textAlign: "center", marginBottom: "var(--gap-xl)" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Nothing logged yet. Your first frame starts when you begin.
          </p>
        </Card>

        {/* Phase overview */}
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>PHASES</div>
        <div className="zt-grid-2">
          {CESSATION_PHASES.map((phase) => (
            <Card key={phase.phase} padding="lg">
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-lg)", color: "var(--ink)", marginBottom: 8 }}>
                {phase.label}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 10 }}>
                DAYS {phase.dayRange.start}–{phase.dayRange.end}
              </div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{phase.focus}</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 8 }}>{phase.description}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const overallProgress = Math.min((currentDay / targetDay) * 100, 100);
  const complete = currentDay >= targetDay;
  const phaseBarPhases = buildPhaseBarPhases(currentDay);

  return (
    <div>
      <PageHeader
        eyebrow="PROTOCOL · CESSATION"
        title="Cessation tracker"
        sub="Your FAAH-informed 150-day protocol, one phase at a time."
        right={
          <Link to="/protocol">
            <Button variant="secondary" iconLeft={<ArrowLeft size={16} />}>
              Protocol
            </Button>
          </Link>
        }
      />

      {/* Hero card — MetricRing + PhaseBar */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
        <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
          <MetricRing
            value={overallProgress}
            max={100}
            tone="vital"
            size={150}
            thickness={15}
            label={`${Math.round(overallProgress)}%`}
            sublabel="complete"
          />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span className="zt-readout" style={{ fontSize: "var(--text-3xl)", color: "var(--ink)" }}>
                Day {currentDay}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {complete
                  ? `Protocol complete · all ${CESSATION_PHASES.length} phases finished`
                  : `${currentPhase.label} phase · ${daysInPhase} days in · target ${targetDay}`}
              </span>
            </div>
            <div style={{ marginTop: 22 }}>
              <PhaseBar phases={phaseBarPhases} height={16} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-2xl)" }}>
        <ProtoStat label="Current day" value={currentDay} />
        <ProtoStat
          label="Days remaining"
          value={Math.max(0, targetDay - currentDay)}
          sub={currentDay >= targetDay ? "Past target" : undefined}
        />
        <ProtoStat
          label="Until next phase"
          value={daysUntilNextPhase || "—"}
        />
        <ProtoStat
          label="Complete"
          value={`${Math.round(overallProgress)}%`}
        />
      </div>

      {/* Phase cards */}
      <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>PHASES</div>
      <div className="zt-grid-2" style={{ marginBottom: "var(--gap-2xl)" }}>
        {CESSATION_PHASES.map((phase) => {
          const pp = phaseProgress.find((p) => p.phase === phase.phase);
          return (
            <PhaseCard
              key={phase.phase}
              phase={phase}
              status={pp?.status || "upcoming"}
              progress={pp?.progress || 0}
            />
          );
        })}
      </div>

      {/* Timeline + Why 150 days */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: "var(--gap-lg)", marginBottom: "var(--gap-lg)" }}>
        <Card padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 12 }}>FAAH CESSATION TIMELINE</div>
          {[
            { label: "Started", value: startDate ? format(parseISO(startDate), "MMMM d, yyyy") : "—", tone: null },
            { label: "Phase end", value: startDate ? format(addDays(parseISO(startDate), currentPhase.dayRange.end), "MMMM d, yyyy") : "—", tone: null },
            { label: "Projected completion", value: projectedCompletion ? format(parseISO(projectedCompletion), "MMMM d, yyyy") : "—", tone: "vital" as const },
          ].map((r, i, arr) => (
            <div
              key={r.label}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-sm)", color: r.tone === "vital" ? "var(--vital)" : "var(--ink)" }}>
                {r.value}
              </span>
            </div>
          ))}
          {cessation?.notes && (
            <div style={{ marginTop: 16, padding: 14, background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              {cessation.notes}
            </div>
          )}
        </Card>

        <Card tone="focus" padding="lg">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Info size={20} color="var(--focus-500, var(--focus))" />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-lg)", color: "var(--ink)" }}>
              Why 150 days?
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
            Lower FAAH activity (K3 inferred from SelfDecode) means slower anandamide breakdown. This
            extends the metabolic clearing timeline beyond the typical 30–60 day window. The previous
            76-day attempt was insufficient. A minimum of 120 days is required, with 150 days
            recommended for full metabolic normalization.
          </p>
        </Card>
      </div>
    </div>
  );
}
