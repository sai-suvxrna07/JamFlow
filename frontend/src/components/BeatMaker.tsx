"use client";

import { useState } from "react";
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
    { name: "tom", steps: Array(16).fill(false) },
    { name: "clap", steps: Array(16).fill(false) },
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
  const [newLaneName, setNewLaneName] = useState("");

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

  function addLane(e: React.FormEvent) {
    e.preventDefault();
    const name = newLaneName.trim().toLowerCase();
    if (!name || pattern.lanes.some((lane) => lane.name === name)) return;
    onChange({
      ...pattern,
      lanes: [...pattern.lanes, { name, steps: Array(pattern.stepsPerBar).fill(false) }],
    });
    setNewLaneName("");
  }

  function removeLane(laneIndex: number) {
    onChange({ ...pattern, lanes: pattern.lanes.filter((_, i) => i !== laneIndex) });
  }

  return (
    <div className="mt-3 rounded border border-line p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted">
          {trackName} beat — any drum or percussion sound
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
            <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-muted">
              {lane.name}
              {trackName === "drums" && (
                <button
                  type="button"
                  onClick={() => removeLane(laneIndex)}
                  aria-label={`Remove ${lane.name} lane`}
                  className="text-muted hover:text-accent"
                >
                  ×
                </button>
              )}
            </span>
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
      {trackName === "drums" && (
        <form onSubmit={addLane} className="mt-3 flex items-center gap-2">
          <input
            value={newLaneName}
            onChange={(e) => setNewLaneName(e.target.value)}
            placeholder="Add a sound (ride, crash, perc…)"
            className="w-48 border-b border-line bg-transparent text-xs outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            className="text-xs font-semibold text-accent disabled:opacity-40"
            disabled={!newLaneName.trim()}
          >
            + Add
          </button>
        </form>
      )}
    </div>
  );
}
