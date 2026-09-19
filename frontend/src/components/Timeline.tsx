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
}

const TIMELINE_BARS = 8;
const BEATS_PER_BAR = 4;
const TOTAL_BEATS = TIMELINE_BARS * BEATS_PER_BAR;
const PX_PER_BEAT = 20;
const TRACK_WIDTH = TOTAL_BEATS * PX_PER_BEAT;
const MIN_GAP_BEATS = 1;

type DragEdge = "start" | "end";

interface DragState {
  track: PatternTrackName;
  edge: DragEdge;
  startX: number;
  original: TrackOverride;
}

const DEFAULT_OVERRIDE: TrackOverride = { start: 0, end: null, pattern: null };

export function Timeline({ arrangement, overrides, onChange }: TimelineProps) {
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

  return (
    <div>
      <h2>Timeline</h2>
      <p className="mt-1 text-sm text-muted">
        Drag a track&apos;s edges to set when it plays. Use &quot;Beat&quot; to draw your own
        rhythm instead of the AI-suggested groove.
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

          {/* Guitar row (fixed, not editable) */}
          <div className="mt-2 flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium">Guitar</span>
            <div
              className="h-8 rounded bg-foreground/80"
              style={{ width: TRACK_WIDTH }}
            />
          </div>

          {/* Saxophone row: read-only, notes come from Gemini */}
          {arrangement.saxophone?.enabled && (
            <div className="mt-3 flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-medium">Saxophone</span>
              <div className="relative h-8" style={{ width: TRACK_WIDTH }}>
                {arrangement.saxophone.notes.map((note, i) => (
                  <div
                    key={i}
                    className="absolute top-1 h-6 rounded-sm bg-foreground/60"
                    style={{
                      left: note.start * PX_PER_BEAT,
                      width: Math.max(note.duration * PX_PER_BEAT, 3),
                    }}
                  />
                ))}
              </div>
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
                    <span className="w-24 shrink-0 text-sm font-medium">{label}</span>
                    <div className="relative h-8" style={{ width: TRACK_WIDTH }}>
                      <div
                        className="absolute top-0 h-8 rounded bg-accent/80"
                        style={{ left: startPx, width: endPx - startPx }}
                      >
                        <div
                          onPointerDown={(e) => startDrag(name, "start", e)}
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l bg-accent"
                        />
                        <div
                          onPointerDown={(e) => startDrag(name, "end", e)}
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r bg-accent"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePattern(name)}
                      className="shrink-0 text-xs font-semibold text-accent"
                    >
                      Beat
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
