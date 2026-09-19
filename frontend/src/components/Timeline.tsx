"use client";

import { useEffect, useRef, useState } from "react";
import { BeatMaker, defaultPattern } from "./BeatMaker";
import type {
  Arrangement,
  PatternTrackName,
  TrackOverride,
  TrackOverrides,
} from "@/lib/types";

interface TimelineProps {
  arrangement: Arrangement;
  overrides: TrackOverrides;
  onChange: (overrides: TrackOverrides) => void;
  onToggleTrack: (track: PatternTrackName | "saxophone") => void;
}

const TIMELINE_BARS = 8;
const BEATS_PER_BAR = 4;
const TOTAL_BEATS = TIMELINE_BARS * BEATS_PER_BAR;
const PX_PER_BEAT = 20;
const TRACK_WIDTH = TOTAL_BEATS * PX_PER_BEAT;
const MIN_GAP_BEATS = 1;

const TRACK_COLORS: Record<string, string> = {
  source: "#161513",
  drums: "#d4571f",
  bass: "#3b6e8f",
  saxophone: "#6b7c3d",
};

type DragEdge = "start" | "end";

interface DragState {
  track: PatternTrackName;
  edge: DragEdge;
  startX: number;
  original: TrackOverride;
}

const DEFAULT_OVERRIDE: TrackOverride = { start: 0, end: null, bpm: null, pattern: null };

export function Timeline({ arrangement, overrides, onChange, onToggleTrack }: TimelineProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingBeat, setEditingBeat] = useState<PatternTrackName | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      const deltaBeats = (e.clientX - current.startX) / PX_PER_BEAT;
      const override = { ...current.original };
      if (current.edge === "start") {
        const maxStart = (override.end ?? TOTAL_BEATS) - MIN_GAP_BEATS;
        override.start = clamp(current.original.start + deltaBeats, 0, maxStart);
      } else {
        const currentEnd = current.original.end ?? TOTAL_BEATS;
        override.end = clamp(
          currentEnd + deltaBeats,
          current.original.start + MIN_GAP_BEATS,
          TOTAL_BEATS
        );
      }
      onChange({ ...overrides, [current.track]: override });
    }
    function handleUp() {
      setDrag(null);
    }
    if (drag) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    }
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, overrides, onChange]);

  const patternTracks: { name: PatternTrackName; label: string; active: boolean }[] = [
    { name: "drums", label: "Drums", active: Boolean(arrangement.drums?.enabled) },
    { name: "bass", label: "Bass", active: Boolean(arrangement.bass?.enabled) },
  ];

  function startDrag(track: PatternTrackName, edge: DragEdge, e: React.PointerEvent) {
    const original = overrides[track] ?? DEFAULT_OVERRIDE;
    setDrag({ track, edge, startX: e.clientX, original });
  }

  function resetTrack(track: PatternTrackName) {
    const rest = { ...overrides };
    delete rest[track];
    onChange(rest);
  }

  function togglePattern(track: PatternTrackName) {
    if (editingBeat === track) {
      setEditingBeat(null);
      return;
    }
    setEditingBeat(track);
    if (!overrides[track]?.pattern) {
      const override = overrides[track] ?? DEFAULT_OVERRIDE;
      onChange({ ...overrides, [track]: { ...override, pattern: defaultPattern(track) } });
    }
  }

  function setTrackBpm(track: PatternTrackName, value: string) {
    const override = overrides[track] ?? DEFAULT_OVERRIDE;
    const bpm = value === "" ? null : clamp(Number(value), 20, 300);
    onChange({ ...overrides, [track]: { ...override, bpm } });
  }

  return (
    <div>
      <h2>Timeline</h2>
      <p className="mt-1 text-sm text-muted">
        Drag a track&apos;s edges to set when it plays, mute it, or set its own BPM.
        Use &quot;Beat&quot; to draw your own rhythm instead of the AI-suggested groove.
      </p>

      <div className="mt-4 overflow-x-auto">
        <div style={{ width: TRACK_WIDTH + 96 }}>
          {/* Ruler */}
          <div className="ml-24 flex text-xs text-muted" style={{ width: TRACK_WIDTH }}>
            {Array.from({ length: TIMELINE_BARS }).map((_, bar) => (
              <div
                key={bar}
                className="border-l border-line pl-1"
                style={{ width: PX_PER_BEAT * BEATS_PER_BAR }}
              >
                {bar + 1}
              </div>
            ))}
          </div>

          {/* Source recording row (fixed, not editable) */}
          <div className="mt-2 flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TRACK_COLORS.source }}
            />
            <span className="w-20 shrink-0 text-sm font-medium capitalize">
              {arrangement.instrument}
            </span>
            <div
              className="h-8 rounded"
              style={{ width: TRACK_WIDTH, backgroundColor: `${TRACK_COLORS.source}cc` }}
            />
          </div>

          {/* Saxophone row: read-only, notes come from Gemini */}
          {arrangement.saxophone?.enabled && (
            <div className="mt-3 flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: TRACK_COLORS.saxophone }}
              />
              <span className="w-20 shrink-0 text-sm font-medium">Saxophone</span>
              <div className="relative h-8" style={{ width: TRACK_WIDTH }}>
                {arrangement.saxophone.notes.map((note, i) => (
                  <div
                    key={i}
                    className="absolute top-1 h-6 rounded-sm"
                    style={{
                      left: note.start * PX_PER_BEAT,
                      width: Math.max(note.duration * PX_PER_BEAT, 3),
                      backgroundColor: TRACK_COLORS.saxophone,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onToggleTrack("saxophone")}
                className="shrink-0 text-xs font-semibold text-muted hover:text-foreground"
              >
                Mute
              </button>
            </div>
          )}

          {patternTracks
            .filter((t) => t.active)
            .map(({ name, label }) => {
              const override = overrides[name] ?? DEFAULT_OVERRIDE;
              const startPx = override.start * PX_PER_BEAT;
              const endPx = (override.end ?? TOTAL_BEATS) * PX_PER_BEAT;
              const isTrimmed = override.start > 0 || override.end !== null;

              return (
                <div key={name}>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TRACK_COLORS[name] }}
                    />
                    <span className="w-20 shrink-0 text-sm font-medium">{label}</span>
                    <div className="relative h-8" style={{ width: TRACK_WIDTH }}>
                      <div
                        className="absolute top-0 h-8 rounded"
                        style={{
                          left: startPx,
                          width: endPx - startPx,
                          backgroundColor: `${TRACK_COLORS[name]}cc`,
                        }}
                      >
                        <div
                          onPointerDown={(e) => startDrag(name, "start", e)}
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l"
                          style={{ backgroundColor: TRACK_COLORS[name] }}
                        />
                        <div
                          onPointerDown={(e) => startDrag(name, "end", e)}
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r"
                          style={{ backgroundColor: TRACK_COLORS[name] }}
                        />
                      </div>
                    </div>
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      BPM
                      <input
                        type="number"
                        min={20}
                        max={300}
                        placeholder={String(arrangement.tempo)}
                        value={override.bpm ?? ""}
                        onChange={(e) => setTrackBpm(name, e.target.value)}
                        className="w-14 border-b border-line bg-transparent text-foreground outline-none focus:border-accent"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePattern(name)}
                      className="shrink-0 text-xs font-semibold text-accent"
                    >
                      Beat
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleTrack(name)}
                      className="shrink-0 text-xs font-semibold text-muted hover:text-foreground"
                    >
                      Mute
                    </button>
                    {isTrimmed && (
                      <button
                        type="button"
                        onClick={() => resetTrack(name)}
                        className="shrink-0 text-xs text-muted underline underline-offset-4 hover:text-foreground"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {editingBeat === name && override.pattern && (
                    <div className="ml-24" style={{ width: TRACK_WIDTH }}>
                      <BeatMaker
                        trackName={name}
                        pattern={override.pattern}
                        onChange={(pattern) =>
                          onChange({ ...overrides, [name]: { ...override, pattern } })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
