"use client";

import type { PatternTrackName, StepLane, StepPattern } from "@/lib/types";

interface BeatMakerProps {
  trackName: PatternTrackName;
  pattern: StepPattern;
  onChange: (pattern: StepPattern) => void;
}

const DEFAULT_LANES: Record<PatternTrackName, StepLane[]> = {
  drums: [
    { name: "kick", steps: Array(16).fill(false) },
    { name: "snare", steps: Array(16).fill(false) },
    { name: "hat", steps: Array(16).fill(false) },
  ],
  bass: [{ name: "note", steps: Array(8).fill(false) }],
};

export function defaultPattern(trackName: PatternTrackName): StepPattern {
  return {
    stepsPerBar: trackName === "drums" ? 16 : 8,
    lanes: DEFAULT_LANES[trackName].map((lane) => ({ ...lane, steps: [...lane.steps] })),
  };
}

export function BeatMaker({ trackName, pattern, onChange }: BeatMakerProps) {
  function toggleStep(laneIndex: number, stepIndex: number) {
    const lanes = pattern.lanes.map((lane, i) => {
      if (i !== laneIndex) return lane;
      const steps = [...lane.steps];
      steps[stepIndex] = !steps[stepIndex];
      return { ...lane, steps };
    });
    onChange({ ...pattern, lanes });
  }

  function clear() {
    onChange(defaultPattern(trackName));
  }

  return (
    <div className="mt-3 rounded border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted">
          {trackName} beat
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div className="mt-2 space-y-1.5">
        {pattern.lanes.map((lane, laneIndex) => (
          <div key={lane.name} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">{lane.name}</span>
            <div className="flex gap-1">
              {lane.steps.map((on, stepIndex) => (
                <button
                  key={stepIndex}
                  type="button"
                  onClick={() => toggleStep(laneIndex, stepIndex)}
                  aria-pressed={on}
                  className={`h-6 w-6 rounded-sm border ${
                    stepIndex % 4 === 0 ? "border-l-2 border-l-muted" : ""
                  } ${on ? "bg-accent border-accent" : "bg-transparent border-line hover:border-muted"}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
