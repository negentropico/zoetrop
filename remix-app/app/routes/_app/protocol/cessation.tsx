import { Info } from "lucide-react";
import type { Route } from "./+types/cessation";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getCessationLog } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/cessation";
import { CESSATION_PHASES, type CessationPhase } from "~/types/protocol";
import { parseISO, format, addDays } from "date-fns";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { PhaseBar } from "~/components/ui/PhaseBar";
import type { Phase } from "~/components/ui/PhaseBar";

// Round 3: "Cessation" renamed to "Phasing" — label-only (screen title,
// eyebrow, dashboard + protocol links); route stays /protocol/cessation.
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Phasing - Zoetrop" },
    { name: "description", content: "Track FAAH-based phasing protocol progress" },
  ];
}

export async function loader({ request }: Route.LoaderArgs, now: Date = new Date()) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const cessationRows = await getCessationLog(ctx);
  // Normalize timestamps to ISO strings for JSON serialization
  const cessation = cessationRows[0]
    ? {
        ...cessationRows[0],
        startDate: cessationRows[0].startDate instanceof Date
          ? cessationRows[0].startDate.toISOString()
          : (cessationRows[0].startDate as unknown as string),
        endDate: cessationRows[0].endDate instanceof Date
          ? cessationRows[0].endDate.toISOString()
          : (cessationRows[0].endDate as unknown as string | null),
        createdAt: cessationRows[0].createdAt instanceof Date
          ? cessationRows[0].createdAt.toISOString()
          : cessationRows[0].createdAt,
      }
    : null;

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

  const currentDay = getCessationDay(cessation.startDate, now);
  const targetDay = 150;

  // Find current phase using survivor engine fn
  const currentPhase = getCurrentCessationPhase(currentDay);

  const daysInPhase = currentDay - currentPhase.dayRange.start + 1;
  const phaseDuration = currentPhase.dayRange.end - currentPhase.dayRange.start + 1;

  // Find next phase
  const currentPhaseIndex = CESSATION_PHASES.findIndex((p) => p.phase === currentPhase.phase);
  const nextPhase = CESSATION_PHASES[currentPhaseIndex + 1];
  const daysUntilNextPhase = nextPhase ? nextPhase.dayRange.start - currentDay : 0;

  // Projected completion
  const startDate = parseISO(cessation.startDate);
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

// Round-3 state styling for the sequential timeline list
const TIMELINE_STATE: Record<
  "completed" | "current" | "upcoming",
  { dot: string; bg: string; fg: string }
> = {
  completed: { dot: "var(--optimal)", bg: "var(--optimal-bg)", fg: "var(--vital-500, var(--vital))" },
  current:   { dot: "var(--ink)",     bg: "var(--focus-50)",   fg: "var(--accent)" },
  upcoming:  { dot: "var(--n-300)",   bg: "var(--n-100)",      fg: "var(--text-muted)" },
};

// Phase timeline row — rail dot + connector, name · days eyebrow · state
// pill; the current phase row is tinted --surface-2 with an ink-ring node.
function PhaseTimelineRow({
  phase,
  status,
  first,
  last,
  startDate,
}: {
  phase: (typeof CESSATION_PHASES)[0];
  status: "completed" | "current" | "upcoming";
  first: boolean;
  last: boolean;
  startDate: string | null;
}) {
  const isCurrent = status === "current";
  const s = TIMELINE_STATE[status];
  const phaseStart = startDate ? addDays(parseISO(startDate), phase.dayRange.start - 1) : null;
  const phaseEnd = startDate ? addDays(parseISO(startDate), phase.dayRange.end - 1) : null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0, 1fr)",
        gap: "var(--gap-lg)",
        padding: "var(--gap-lg) var(--gap-card)",
        borderBottom: !last ? "1px solid var(--border)" : "none",
        background: isCurrent ? "var(--surface-2)" : "transparent",
      }}
    >
      {/* timeline rail */}
      <div style={{ position: "relative" }}>
        {!first && <span style={{ position: "absolute", left: 9, top: -17, height: 16, width: 1, background: "var(--border)" }} />}
        {!last && <span style={{ position: "absolute", left: 9, top: 21, bottom: -17, width: 1, background: "var(--border)" }} />}
        <span
          style={{
            position: "absolute",
            left: 4,
            top: 5,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: isCurrent ? "var(--surface)" : s.dot,
            border: isCurrent ? "2.5px solid var(--ink)" : "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--gap-lg)", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)" }}>{phase.label}</span>
          <span className="zt-eyebrow">Days {phase.dayRange.start}–{phase.dayRange.end}</span>
          <span
            style={{
              marginLeft: "auto",
              padding: "3px 9px",
              borderRadius: "var(--radius-pill)",
              flex: "0 0 auto",
              background: s.bg,
              color: s.fg,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {status === "current" ? "current" : status}
          </span>
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 6, textWrap: "pretty" }}>
          {phase.focus} — {phase.description}
        </div>
        <div className="zt-tnum" style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
          {phaseStart && phaseEnd
            ? `${format(phaseStart, "MMM d, yyyy")} → ${format(phaseEnd, "MMM d, yyyy")} · `
            : ""}
          {phase.dayRange.end - phase.dayRange.start + 1} days
        </div>
      </div>
    </div>
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
          eyebrow="PROTOCOL · PHASING"
          title="Phasing"
          sub="Your FAAH-informed 150-day protocol, one phase at a time."
        />
        <Card padding="lg" style={{ textAlign: "center", marginBottom: "var(--gap-xl)" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Nothing logged yet. Your first frame starts when you begin.
          </p>
        </Card>

        {/* Phase overview — sequential timeline list */}
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>PHASES</div>
        <Card padding="none">
          {CESSATION_PHASES.map((phase, i) => (
            <PhaseTimelineRow
              key={phase.phase}
              phase={phase}
              status="upcoming"
              first={i === 0}
              last={i === CESSATION_PHASES.length - 1}
              startDate={null}
            />
          ))}
        </Card>
      </div>
    );
  }

  const overallProgress = Math.min((currentDay / targetDay) * 100, 100);
  const complete = currentDay >= targetDay;
  const phaseBarPhases = buildPhaseBarPhases(currentDay);
  const protocolStart = startDate ? parseISO(startDate) : null;
  const protocolEnd = protocolStart ? addDays(protocolStart, targetDay - 1) : null;

  return (
    <div>
      <PageHeader
        eyebrow="PROTOCOL · PHASING"
        title="Phasing"
        sub="Your FAAH-informed 150-day protocol, one phase at a time."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="zt-eyebrow" style={{ marginBottom: 4 }}>Current day</div>
            <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>{currentDay}</div>
          </div>
        }
      />

      {/* Phase bar with current-day marker (unchanged idiom, round 3) */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
        <PhaseBar phases={phaseBarPhases} height={20} day={currentDay} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-faint)",
            letterSpacing: "0.06em",
          }}
        >
          <span>{protocolStart ? format(protocolStart, "MMM d, yyyy").toUpperCase() : "—"}</span>
          <span>{protocolEnd ? format(protocolEnd, "MMM d, yyyy").toUpperCase() : "—"}</span>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-2xl)" }}>
        <ProtoStat label="Current day" value={currentDay} sub={complete ? "Protocol complete" : `${currentPhase.label} phase · ${daysInPhase} days in`} />
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

      {/* Phases — stacked sequential timeline list in one frame card */}
      <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>PHASES</div>
      <Card padding="none" style={{ marginBottom: "var(--gap-2xl)" }}>
        {CESSATION_PHASES.map((phase, i) => {
          const pp = phaseProgress.find((p) => p.phase === phase.phase);
          return (
            <PhaseTimelineRow
              key={phase.phase}
              phase={phase}
              status={pp?.status || "upcoming"}
              first={i === 0}
              last={i === CESSATION_PHASES.length - 1}
              startDate={startDate}
            />
          );
        })}
      </Card>

      {/* Timeline + Why 150 days */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: "var(--gap-lg)", marginBottom: "var(--gap-lg)" }}>
        <Card padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: 12 }}>FAAH PHASING TIMELINE</div>
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
              Why {targetDay} days?
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
            This protocol uses a {targetDay}-day window because FAAH-informed metabolic clearing extends
            beyond the typical 30–60 day range. Reduced FAAH activity slows anandamide breakdown,
            extending the clearance timeline. A minimum of 120 days is used, with {targetDay} days
            recommended for full metabolic normalization.
          </p>
        </Card>
      </div>
    </div>
  );
}
