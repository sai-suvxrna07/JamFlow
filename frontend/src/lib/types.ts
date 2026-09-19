// Shared types mirroring the backend's arrangement schema (backend/app/schemas.py).

export type Energy = "low" | "medium" | "high";

export interface NoteEvent {
  pitch: string; // e.g. "A3"
  start: number; // beats from arrangement start
  duration: number; // in beats
  velocity: number; // 0-1
}

export interface RhythmSectionTrack {
  enabled: boolean;
  style: string;
  intensity: number; // 0-1
}

export interface MelodicTrack {
  enabled: boolean;
  role: string; // e.g. "call_and_response", "lead", "pad"
  notes: NoteEvent[];
}

export interface ExtraInstrument {
  name: string; // e.g. "piano", "strings", "synth pad"
  role: string; // e.g. "pad", "lead", "accent"
  notes: NoteEvent[];
}

export interface Arrangement {
  tempo: number;
  key: string;
  time_signature: string;
  energy: Energy;
  style: string;
  instrument: string; // the instrument heard in the original recording
  drums?: RhythmSectionTrack;
  bass?: RhythmSectionTrack;
  saxophone?: MelodicTrack;
  extra_instruments: ExtraInstrument[];
  notes?: string; // short human-readable summary of the latest change
}

export interface AnalyzeResponse {
  arrangement: Arrangement;
}

export interface CommandRequest {
  instruction: string;
  arrangement: Arrangement;
  song_length_bars?: number | null;
}

// --- Timeline / beat-maker state ---
// These are UI-only concerns (when a track plays, and any hand-drawn beat
// pattern) — Gemini never sees or sets them, so they live outside Arrangement.

export type PatternTrackName = "drums" | "bass";

export interface StepLane {
  name: string; // e.g. "kick", "snare", "hat", "note"
  steps: boolean[]; // fixed length, one bar's worth of steps
}

export interface StepPattern {
  stepsPerBar: number; // e.g. 16
  lanes: StepLane[];
}

export interface TrackOverride {
  start: number; // beats from arrangement start
  end: number | null; // beats from arrangement start; null = play through
  bpm: number | null; // independent tempo for this track; null = follow the song tempo
  pattern?: StepPattern | null;
}

export type TrackOverrides = Partial<Record<PatternTrackName, TrackOverride>>;

export interface CommandResponse {
  arrangement: Arrangement;
}
