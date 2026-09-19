import type { Arrangement, NoteEvent, TrackOverride, TrackOverrides } from "./types";

// Minimal Tone.js-backed playback engine. This approximates the arrangement
// with simple synths rather than rendering full production-quality samples.
export class ArrangementPlayer {
  private toneModule: typeof import("tone") | null = null;
  private sourcePlayer: import("tone").Player | null = null;
  private drumKick: import("tone").MembraneSynth | null = null;
  private drumSnare: import("tone").NoiseSynth | null = null;
  private drumHat: import("tone").NoiseSynth | null = null;
  private bassSynth: import("tone").MonoSynth | null = null;
  private saxSynth: import("tone").Synth | null = null;
  private drumLoop: import("tone").Loop | null = null;
  private bassLoop: import("tone").Loop | null = null;
  private saxPart: import("tone").Part | null = null;

  async play(
    arrangement: Arrangement,
    sourceAudioUrl: string | null,
    overrides: TrackOverrides = {}
  ) {
    const Tone = await import("tone");
    this.toneModule = Tone;
    await Tone.start();
    this.stop();

    Tone.getTransport().bpm.value = arrangement.tempo;
    const secondsPerSongBeat = 60 / arrangement.tempo;

    if (sourceAudioUrl) {
      this.sourcePlayer = new Tone.Player().toDestination();
      // Player loads its buffer asynchronously — must await before starting playback.
      await this.sourcePlayer.load(sourceAudioUrl);
    }

    if (arrangement.drums?.enabled) {
      const override = overrides.drums;
      const intensity = arrangement.drums.intensity;
      const beatSeconds = 60 / (override?.bpm ?? arrangement.tempo);
      this.drumKick = new Tone.MembraneSynth({
        volume: -10 + intensity * 8,
      }).toDestination();
      this.drumSnare = new Tone.NoiseSynth({
        volume: -14 + intensity * 8,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
      }).toDestination();
      this.drumHat = new Tone.NoiseSynth({
        volume: -18 + intensity * 12,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      }).toDestination();

      const pattern = override?.pattern;
      if (pattern) {
        const stepsPerBar = pattern.stepsPerBar;
        const beatsPerStep = 4 / stepsPerBar;
        let step = 0;
        this.drumLoop = new Tone.Loop((time) => {
          if (isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override)) {
            for (const lane of pattern.lanes) {
              if (!lane.steps[step % lane.steps.length]) continue;
              if (lane.name === "kick") this.drumKick?.triggerAttackRelease("C1", "8n", time);
              else if (lane.name === "snare") this.drumSnare?.triggerAttackRelease("16n", time);
              else if (lane.name === "hat") this.drumHat?.triggerAttackRelease("16n", time);
            }
          }
          step += 1;
        }, beatSeconds * beatsPerStep).start(0);
      } else {
        let step = 0;
        this.drumLoop = new Tone.Loop((time) => {
          if (isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override)) {
            if (step % 2 === 0) this.drumKick?.triggerAttackRelease("C1", "8n", time);
            this.drumHat?.triggerAttackRelease("16n", time);
          }
          step += 1;
        }, beatSeconds * 0.5).start(0);
      }
    }

    if (arrangement.bass?.enabled) {
      const override = overrides.bass;
      const beatSeconds = 60 / (override?.bpm ?? arrangement.tempo);
      this.bassSynth = new Tone.MonoSynth({
        volume: -8,
        oscillator: { type: "sine" },
      }).toDestination();
      const rootNote = `${rootPitchFromKey(arrangement.key)}2`;

      const pattern = override?.pattern;
      if (pattern) {
        const stepsPerBar = pattern.stepsPerBar;
        const beatsPerStep = 4 / stepsPerBar;
        const lane = pattern.lanes[0];
        let step = 0;
        this.bassLoop = new Tone.Loop((time) => {
          const inRange = isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override);
          if (inRange && lane?.steps[step % lane.steps.length]) {
            this.bassSynth?.triggerAttackRelease(rootNote, "8n", time);
          }
          step += 1;
        }, beatSeconds * beatsPerStep).start(0);
      } else {
        this.bassLoop = new Tone.Loop((time) => {
          if (isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override)) {
            this.bassSynth?.triggerAttackRelease(rootNote, "2n", time);
          }
        }, beatSeconds * 4).start(0);
      }
    }

    if (arrangement.saxophone?.enabled && arrangement.saxophone.notes.length) {
      this.saxSynth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        volume: -6,
      }).toDestination();

      const events = arrangement.saxophone.notes.map((note: NoteEvent) => ({
        time: `0:${note.start}`,
        note: note.pitch,
        duration: note.duration,
        velocity: note.velocity,
      }));

      this.saxPart = new Tone.Part((time, value) => {
        this.saxSynth?.triggerAttackRelease(
          value.note,
          `${value.duration}n`,
          time,
          value.velocity
        );
      }, events).start(0);
    }

    this.sourcePlayer?.start(0);
    Tone.getTransport().start();
  }

  stop() {
    const Tone = this.toneModule;
    Tone?.getTransport().stop();
    Tone?.getTransport().cancel();
    [this.drumLoop, this.bassLoop, this.saxPart].forEach((node) => node?.dispose());
    [
      this.sourcePlayer,
      this.drumKick,
      this.drumSnare,
      this.drumHat,
      this.bassSynth,
      this.saxSynth,
    ].forEach((node) => node?.dispose());
    this.sourcePlayer = null;
    this.drumKick = null;
    this.drumSnare = null;
    this.drumHat = null;
    this.bassSynth = null;
    this.saxSynth = null;
    this.drumLoop = null;
    this.bassLoop = null;
    this.saxPart = null;
  }
}

function isWithinRange(
  transportSeconds: number,
  secondsPerSongBeat: number,
  override: TrackOverride | undefined
): boolean {
  if (!override) return true;
  if (transportSeconds < override.start * secondsPerSongBeat) return false;
  if (override.end !== null && transportSeconds >= override.end * secondsPerSongBeat) return false;
  return true;
}

function rootPitchFromKey(key: string): string {
  const match = key.trim().match(/^[A-Ga-g][#b]?/);
  return match ? match[0].toUpperCase() : "A";
}
