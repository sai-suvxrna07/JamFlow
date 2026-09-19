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

export interface Arrangement {
  tempo: number;
  key: string;
  time_signature: string;
  energy: Energy;
  style: string;
  drums?: RhythmSectionTrack;
  bass?: RhythmSectionTrack;
  saxophone?: MelodicTrack;
  notes?: string; // short human-readable summary of the latest change
}

export interface AnalyzeResponse {
  arrangement: Arrangement;
}

export interface CommandRequest {
  instruction: string;
  arrangement: Arrangement;
}

export interface CommandResponse {
  arrangement: Arrangement;
}
