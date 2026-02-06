import type { Route } from "./+types/cessation";
import { realCessationLog, CESSATION_START_DATE } from "../../lib/protocol-data";
import { CESSATION_PHASES, type CessationPhase } from "../../types/protocol";
import { differenceInDays, parseISO, format, addDays } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cessation Tracker - Wellness Tracker" },
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

function PhaseCard({
  phase,
  status,
  progress,
  isCurrent,
}: {
  phase: (typeof CESSATION_PHASES)[0];
  status: "completed" | "current" | "upcoming";
  progress: number;
  isCurrent: boolean;
}) {
  const statusColors = {
    completed: "border-green-500 bg-green-50 dark:bg-green-900/20",
    current: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    upcoming: "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${statusColors[status]} ${
        isCurrent ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-950" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{phase.label}</h3>
        <span className="text-sm text-gray-500">
          Days {phase.dayRange.start}-{phase.dayRange.end}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{phase.focus}</p>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "completed"
              ? "bg-green-500"
              : status === "current"
              ? "bg-blue-500"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>
          {status === "completed"
            ? "Completed"
            : status === "current"
            ? `${progress}%`
            : "Upcoming"}
        </span>
        <span>{phase.dayRange.end - phase.dayRange.start + 1} days</span>
      </div>

      {/* Phase description */}
      <p className="text-xs text-gray-500 mt-3">{phase.description}</p>
    </div>
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
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Active Cessation Protocol</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start tracking your FAAH-based cessation protocol to monitor progress through all four
            phases.
          </p>
          <button className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            Start Cessation Protocol
          </button>
        </div>

        {/* Phase overview */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-medium mb-4">FAAH-Based Protocol Phases</h3>
          <div className="space-y-4">
            {CESSATION_PHASES.map((phase) => (
              <div key={phase.phase} className="flex gap-4">
                <div className="w-24 text-sm font-medium">{phase.label}</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Days {phase.dayRange.start}-{phase.dayRange.end}: {phase.focus}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{phase.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = Math.min((currentDay / targetDay) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Main progress */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Day {currentDay}</h2>
            <p className="text-gray-500">
              {currentPhase.label} Phase • {daysInPhase} days in
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Target</div>
            <div className="text-xl font-semibold">{targetDay} days</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="relative mb-4">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {/* Phase markers */}
          <div className="absolute inset-0 flex pointer-events-none">
            {CESSATION_PHASES.slice(0, -1).map((phase) => (
              <div
                key={phase.phase}
                className="border-r-2 border-white dark:border-gray-950"
                style={{
                  width: `${((phase.dayRange.end + 1) / targetDay) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold">{currentDay}</div>
            <div className="text-xs text-gray-500">Current Day</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold">{targetDay - currentDay}</div>
            <div className="text-xs text-gray-500">Days Remaining</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold">{daysUntilNextPhase || "—"}</div>
            <div className="text-xs text-gray-500">Until Next Phase</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CESSATION_PHASES.map((phase) => {
          const progress = phaseProgress.find((p) => p.phase === phase.phase);
          return (
            <PhaseCard
              key={phase.phase}
              phase={phase}
              status={progress?.status || "upcoming"}
              progress={progress?.progress || 0}
              isCurrent={phase.phase === currentPhase.phase}
            />
          );
        })}
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-4">Timeline</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Started</span>
            <span className="font-medium">{startDate ? format(parseISO(startDate), "MMMM d, yyyy") : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current Phase End</span>
            <span className="font-medium">
              {startDate ? format(addDays(parseISO(startDate), currentPhase.dayRange.end), "MMMM d, yyyy") : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Projected Completion</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {projectedCompletion ? format(parseISO(projectedCompletion), "MMMM d, yyyy") : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {cessation?.notes && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-medium mb-2">Notes</h3>
          <p className="text-gray-600 dark:text-gray-400">{cessation.notes}</p>
        </div>
      )}

      {/* FAAH explanation */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Why 150 Days?</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Lower FAAH activity (K3 inferred from SelfDecode) means slower anandamide breakdown. This
          extends the metabolic clearing timeline beyond the typical 30-60 day window. The previous
          76-day attempt was insufficient. A minimum of 120 days is required, with 150 days
          recommended for full metabolic normalization.
        </p>
      </div>
    </div>
  );
}
