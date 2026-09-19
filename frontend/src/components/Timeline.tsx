"use client";

import { useEffect, useRef, useState } from "react";
import { BeatMaker, defaultPattern } from "./BeatMaker";
import type {
  Arrangement,
  PatternTrackName,
  TrackOverride,
  TrackOverrides,
  TrackVolumes,
} from "@/lib/types";

interface TimelineProps {
  arrangement: Arrangement;
  overrides: TrackOverrides;
  onChange: (overrides: TrackOverrides) => void;
  onToggleTrack: (track: PatternTrackName | "saxophone") => void;
  songLengthBars: number;
  onSongLengthChange: (bars: number) => void;
  volumes: TrackVolumes;
  onVolumeChange: (track: string, value: number) => void;
}

const BEATS_PER_BAR = 4;
const PX_PER_BEAT = 20;
const MIN_GAP_BEATS = 1;
const GRID_COLS = "grid-cols-[6rem_minmax(0,1fr)_auto]";

const TRACK_COLORS: Record<string, string> = {
  source: "#161513",
  drums: "#d4571f",
  bass: "#3b6e8f",
  saxophone: "#6b7c3d",
};
const EXTRA_COLORS = ["#8a5a99", "#b08900", "#4d7c6f"];

type DragEdge = "start" | "end";

interface DragState {
  track: PatternTrackName;
  edge: DragEdge;
  startX: number;
  original: TrackOverride;
}

const DEFAULT_OVERRIDE: TrackOverride = { start: 0, end: null, bpm: null, pattern: null };

export function Timeline({
  arrangement,
  overrides,
  onChange,
  onToggleTrack,
  songLengthBars,
  onSongLengthChange,
  volumes,
  onVolumeChange,
}: TimelineProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingBeat, setEditingBeat] = useState<PatternTrackName | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const totalBeats = songLengthBars * BEATS_PER_BAR;
  const trackWidth = totalBeats * PX_PER_BEAT;

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      const deltaBeats = (e.clientX - current.startX) / PX_PER_BEAT;
      const override = { ...current.original };
      if (current.edge === "start") {
        const maxStart = (override.end ?? totalBeats) - MIN_GAP_BEATS;
        override.start = clamp(current.original.start + deltaBeats, 0, maxStart);
      } else {
        const currentEnd = current.original.end ?? totalBeats;
        override.end = clamp(
          currentEnd + deltaBeats,
          current.original.start + MIN_GAP_BEATS,
          totalBeats
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
  }, [drag, overrides, onChange, totalBeats]);

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

  function VolumeControl({ trackKey }: { trackKey: string }) {
    const percent = Math.round((volumes[trackKey] ?? 1) * 100);
    return (
      <label className="flex items-center gap-1 text-xs text-muted">
        Vol
        <input
          type="range"
          min={0}
          max={150}
          value={percent}
          onChange={(e) => onVolumeChange(trackKey, Number(e.target.value) / 100)}
          className="w-16 accent-accent"
        />
        <span className="w-8 text-right font-mono">{percent}%</span>
      </label>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2>Timeline</h2>
        <label className="flex items-center gap-2 text-xs text-muted">
          Song length
          <input
            type="number"
            min={1}
            max={64}
            value={songLengthBars}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isNaN(value) && value > 0) onSongLengthChange(value);
            }}
            className="w-14 border-b border-line bg-transparent text-foreground outline-none focus:border-accent"
          />
          bars
        </label>
      </div>
      <p className="mt-1 text-sm text-muted">
        Drag a track&apos;s edges to set when it plays, mute it, or set its own BPM.
        Use &quot;Beat&quot; to draw your own rhythm instead of the AI-suggested groove.
      </p>

      <div className="mt-4">
        {/* Ruler */}
        <div className={`grid ${GRID_COLS} items-center gap-3`}>
          <div />
          <div className="overflow-x-auto">
            <div className="flex text-xs text-muted" style={{ width: trackWidth }}>
              {Array.from({ length: songLengthBars }).map((_, bar) => (
                <div
                  key={bar}
                  className="border-l border-line pl-1"
                  style={{ width: PX_PER_BEAT * BEATS_PER_BAR }}
                >
                  {bar + 1}
                </div>
              ))}
            </div>
          </div>
          <div />
        </div>

        {/* Source recording row (fixed, not editable) */}
        <div className={`mt-2 grid ${GRID_COLS} items-center gap-3`}>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TRACK_COLORS.source }}
            />
            <span className="text-sm font-medium capitalize">{arrangement.instrument}</span>
          </div>
          <div className="overflow-x-auto">
            <div
              className="h-8 rounded"
              style={{ width: trackWidth, backgroundColor: `${TRACK_COLORS.source}cc` }}
            />
          </div>
          <div>
            <VolumeControl trackKey="source" />
          </div>
        </div>

        {/* Saxophone row: read-only, notes come from Gemini */}
        {arrangement.saxophone?.enabled && (
          <div className={`mt-3 grid ${GRID_COLS} items-center gap-3`}>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: TRACK_COLORS.saxophone }}
              />
              <span className="text-sm font-medium">Saxophone</span>
            </div>
            <div className="overflow-x-auto">
              <div className="relative h-8" style={{ width: trackWidth }}>
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
            </div>
            <div>
              <button
                type="button"
                onClick={() => onToggleTrack("saxophone")}
                className="text-xs font-semibold text-muted hover:text-foreground"
              >
                Mute
              </button>
              <div className="mt-1">
                <VolumeControl trackKey="saxophone" />
              </div>
            </div>
          </div>
        )}

        {/* Extra instruments Gemini adds beyond drums/bass/sax: read-only, notes from Gemini */}
        {arrangement.extra_instruments.map((extra, i) => (
          <div key={extra.name} className={`mt-3 grid ${GRID_COLS} items-center gap-3`}>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: EXTRA_COLORS[i % EXTRA_COLORS.length] }}
              />
              <span className="text-sm font-medium capitalize">{extra.name}</span>
            </div>
            <div className="overflow-x-auto">
              <div className="relative h-8" style={{ width: trackWidth }}>
                {extra.notes.map((note, noteIndex) => (
                  <div
                    key={noteIndex}
                    className="absolute top-1 h-6 rounded-sm"
                    style={{
                      left: note.start * PX_PER_BEAT,
                      width: Math.max(note.duration * PX_PER_BEAT, 3),
                      backgroundColor: EXTRA_COLORS[i % EXTRA_COLORS.length],
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <VolumeControl trackKey={`extra:${extra.name}`} />
            </div>
          </div>
        ))}

        {patternTracks
          .filter((t) => t.active)
          .map(({ name, label }) => {
            const override = overrides[name] ?? DEFAULT_OVERRIDE;
            const startPx = override.start * PX_PER_BEAT;
            const endPx = (override.end ?? totalBeats) * PX_PER_BEAT;
            const isTrimmed = override.start > 0 || override.end !== null;

            return (
              <div key={name}>
                <div className={`mt-3 grid ${GRID_COLS} items-center gap-3`}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TRACK_COLORS[name] }}
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="relative h-8" style={{ width: trackWidth }}>
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
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap pl-2">
                    <VolumeControl trackKey={name} />
                    <label className="flex items-center gap-1 text-xs text-muted">
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
                      className="text-xs font-semibold text-accent"
                    >
                      Beat
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleTrack(name)}
                      className="text-xs font-semibold text-muted hover:text-foreground"
                    >
                      Mute
                    </button>
                    {isTrimmed && (
                      <button
                        type="button"
                        onClick={() => resetTrack(name)}
                        className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                {editingBeat === name && override.pattern && (
                  <div className="ml-24">
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
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

