import type { Arrangement, NoteEvent } from "./types";

// Minimal Tone.js-backed playback engine. This approximates the arrangement
// with simple synths rather than rendering full production-quality samples.
export class ArrangementPlayer {
  private toneModule: typeof import("tone") | null = null;
  private guitarPlayer: import("tone").Player | null = null;
  private drumHat: import("tone").NoiseSynth | null = null;
  private drumKick: import("tone").MembraneSynth | null = null;
  private bassSynth: import("tone").MonoSynth | null = null;
  private saxSynth: import("tone").Synth | null = null;
  private drumLoop: import("tone").Loop | null = null;
  private bassLoop: import("tone").Loop | null = null;
  private saxPart: import("tone").Part | null = null;

  async play(arrangement: Arrangement, guitarAudioUrl: string | null) {
    const Tone = await import("tone");
    this.toneModule = Tone;
    await Tone.start();
    this.stop();

    Tone.getTransport().bpm.value = arrangement.tempo;

    if (guitarAudioUrl) {
      this.guitarPlayer = new Tone.Player(guitarAudioUrl).toDestination();
    }

    if (arrangement.drums?.enabled) {
      this.drumHat = new Tone.NoiseSynth({
        volume: -18 + arrangement.drums.intensity * 12,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      }).toDestination();
      this.drumKick = new Tone.MembraneSynth({
        volume: -10 + arrangement.drums.intensity * 8,
      }).toDestination();

      let step = 0;
      this.drumLoop = new Tone.Loop((time) => {
        if (step % 2 === 0) this.drumKick?.triggerAttackRelease("C1", "8n", time);
        this.drumHat?.triggerAttackRelease("16n", time);
        step += 1;
      }, "8n").start(0);
    }

    if (arrangement.bass?.enabled) {
      this.bassSynth = new Tone.MonoSynth({
        volume: -8,
        oscillator: { type: "sine" },
      }).toDestination();
      const rootNote = `${rootPitchFromKey(arrangement.key)}2`;
      this.bassLoop = new Tone.Loop((time) => {
        this.bassSynth?.triggerAttackRelease(rootNote, "2n", time);
      }, "1m").start(0);
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

    this.guitarPlayer?.start(0);
    Tone.getTransport().start();
  }

  stop() {
    const Tone = this.toneModule;
    Tone?.getTransport().stop();
    Tone?.getTransport().cancel();
    [this.drumLoop, this.bassLoop, this.saxPart].forEach((node) => node?.dispose());
    [this.guitarPlayer, this.drumHat, this.drumKick, this.bassSynth, this.saxSynth].forEach(
      (node) => node?.dispose()
    );
    this.guitarPlayer = null;
    this.drumHat = null;
    this.drumKick = null;
    this.bassSynth = null;
    this.saxSynth = null;
    this.drumLoop = null;
    this.bassLoop = null;
    this.saxPart = null;
  }
}

function rootPitchFromKey(key: string): string {
  const match = key.trim().match(/^[A-Ga-g][#b]?/);
  return match ? match[0].toUpperCase() : "A";
}
