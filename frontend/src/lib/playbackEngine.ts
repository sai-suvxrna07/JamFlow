import type {
  Arrangement,
  NoteEvent,
  TrackOverride,
  TrackOverrides,
  TrackVolumes,
} from "./types";

type Tone = typeof import("tone");
type DrumVoice = import("tone").MembraneSynth | import("tone").NoiseSynth;

// Membrane (pitched) drum sounds vs. noise-based percussion, keyed by lane name.
const MEMBRANE_LANES: Record<string, string> = {
  kick: "C1",
  tom: "G1",
  floor: "E1",
};
const NOISE_DECAY: Record<string, number> = {
  snare: 0.15,
  clap: 0.08,
  hat: 0.05,
  ride: 0.3,
  crash: 0.6,
};

function createDrumVoice(Tone: Tone, laneName: string, intensity: number): DrumVoice {
  const membranePitch = MEMBRANE_LANES[laneName];
  if (membranePitch) {
    return new Tone.MembraneSynth({ volume: -10 + intensity * 8 });
  }
  const decay = NOISE_DECAY[laneName] ?? 0.05;
  return new Tone.NoiseSynth({
    volume: -16 + intensity * 10,
    envelope: { attack: 0.001, decay, sustain: 0 },
  });
}

function triggerDrumVoice(voice: DrumVoice, laneName: string, time: number) {
  const membranePitch = MEMBRANE_LANES[laneName];
  if (membranePitch && "triggerAttackRelease" in voice) {
    (voice as import("tone").MembraneSynth).triggerAttackRelease(membranePitch, "8n", time);
  } else {
    (voice as import("tone").NoiseSynth).triggerAttackRelease("16n", time);
  }
}

// A default (AI-suggested, non-custom) groove per energy level, so the fallback
// rhythm actually fits the song instead of one generic pulse for everything.
// Each step is an 8th note; `true` triggers that lane.
const DEFAULT_GROOVES: Record<Arrangement["energy"], Record<string, boolean[]>> = {
  low: {
    kick: [true, false, false, false, true, false, false, false],
    hat: [true, false, true, false, true, false, true, false],
    snare: [false, false, false, false, false, false, false, false],
  },
  medium: {
    kick: [true, false, false, true, false, false, true, false],
    hat: [true, true, true, true, true, true, true, true],
    snare: [false, false, true, false, false, false, true, false],
  },
  high: {
    kick: [true, false, true, false, true, false, true, true],
    hat: [true, true, true, true, true, true, true, true],
    snare: [false, false, true, false, false, false, true, false],
  },
};

// Minimal Tone.js-backed playback engine. This approximates the arrangement
// with simple synths rather than rendering full production-quality samples.
export class ArrangementPlayer {
  private toneModule: Tone | null = null;
  private sourcePlayer: import("tone").Player | null = null;
  private drumVoices: Map<string, DrumVoice> = new Map();
  private bassSynth: import("tone").MonoSynth | null = null;
  private saxSynth: import("tone").Synth | null = null;
  private extraSynths: Map<string, import("tone").Synth> = new Map();
  private drumLoop: import("tone").Loop | null = null;
  private bassLoop: import("tone").Loop | null = null;
  private saxPart: import("tone").Part | null = null;
  private extraParts: import("tone").Part[] = [];
  private gains: Map<string, import("tone").Gain> = new Map();
  private masterBus: import("tone").Gain | null = null;
  private reverbSend: import("tone").Reverb | null = null;

  // Shared compressor + limiter glue so stacked instruments don't clip or fight for
  // headroom, plus a light reverb send so melodic parts sit in the same space.
  private getMasterBus(Tone: Tone): import("tone").Gain {
    if (!this.masterBus) {
      const compressor = new Tone.Compressor({ threshold: -18, ratio: 3 });
      const limiter = new Tone.Limiter(-1);
      this.masterBus = new Tone.Gain(1);
      this.masterBus.chain(compressor, limiter, Tone.getDestination());
      this.reverbSend = new Tone.Reverb({ decay: 1.8, wet: 0.16 }).connect(this.masterBus);
    }
    return this.masterBus;
  }

  // Per-track gain node so a track's volume can be adjusted without recreating its voices.
  private getGain(Tone: Tone, track: string, volumes: TrackVolumes): import("tone").Gain {
    let gain = this.gains.get(track);
    if (!gain) {
      gain = new Tone.Gain(volumes[track] ?? 1).connect(this.getMasterBus(Tone));
      this.gains.set(track, gain);
    }
    return gain;
  }

  async play(
    arrangement: Arrangement,
    sourceAudioUrl: string | null,
    overrides: TrackOverrides = {},
    volumes: TrackVolumes = {},
    sourceTrimSeconds = 0
  ) {
    const Tone = await import("tone");
    this.toneModule = Tone;
    await Tone.start();
    this.stop();

    Tone.getTransport().bpm.value = arrangement.tempo;
    const secondsPerSongBeat = 60 / arrangement.tempo;

    if (sourceAudioUrl) {
      this.sourcePlayer = new Tone.Player().connect(this.getGain(Tone, "source", volumes));
      // Player loads its buffer asynchronously — must await before starting playback.
      await this.sourcePlayer.load(sourceAudioUrl);
    }

    if (arrangement.drums?.enabled) {
      const override = overrides.drums;
      const intensity = arrangement.drums.intensity;
      const beatSeconds = 60 / (override?.bpm ?? arrangement.tempo);
      const drumGain = this.getGain(Tone, "drums", volumes);
      const pattern = override?.pattern;
      const lanes = pattern ? pattern.lanes.map((l) => l.name) : ["kick", "snare", "hat"];
      for (const name of lanes) {
        this.drumVoices.set(name, createDrumVoice(Tone, name, intensity).connect(drumGain));
      }

      if (pattern) {
        const beatsPerStep = 4 / pattern.stepsPerBar;
        let step = 0;
        this.drumLoop = new Tone.Loop((time) => {
          if (isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override)) {
            for (const lane of pattern.lanes) {
              if (!lane.steps[step % lane.steps.length]) continue;
              const voice = this.drumVoices.get(lane.name);
              if (voice) triggerDrumVoice(voice, lane.name, time);
            }
          }
          step += 1;
        }, beatSeconds * beatsPerStep).start(0);
      } else {
        const groove = DEFAULT_GROOVES[arrangement.energy] ?? DEFAULT_GROOVES.medium;
        let step = 0;
        this.drumLoop = new Tone.Loop((time) => {
          if (isWithinRange(Tone.getTransport().seconds, secondsPerSongBeat, override)) {
            for (const [name, steps] of Object.entries(groove)) {
              if (!steps[step % steps.length]) continue;
              const voice = this.drumVoices.get(name);
              if (voice) triggerDrumVoice(voice, name, time);
            }
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
      }).connect(this.getGain(Tone, "bass", volumes));
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
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
      }).connect(this.getGain(Tone, "saxophone", volumes));
      if (this.reverbSend) this.saxSynth.connect(this.reverbSend);
      this.saxPart = createNotePart(Tone, this.saxSynth, arrangement.saxophone.notes).start(0);
    }

    for (const extra of arrangement.extra_instruments) {
      if (!extra.notes.length) continue;
      const trackKey = `extra:${extra.name}`;
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        volume: -8,
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
      }).connect(this.getGain(Tone, trackKey, volumes));
      if (this.reverbSend) synth.connect(this.reverbSend);
      this.extraSynths.set(extra.name, synth);
      this.extraParts.push(createNotePart(Tone, synth, extra.notes).start(0));
    }

    this.sourcePlayer?.start(0, sourceTrimSeconds);
    Tone.getTransport().start();
  }

  // Update a track's volume live, without restarting playback.
  setVolume(track: string, value: number) {
    const gain = this.gains.get(track);
    if (gain) gain.gain.value = value;
  }

  stop() {
    const Tone = this.toneModule;
    Tone?.getTransport().stop();
    Tone?.getTransport().cancel();
    [this.drumLoop, this.bassLoop, this.saxPart, ...this.extraParts].forEach((node) =>
      node?.dispose()
    );
    [this.sourcePlayer, this.bassSynth, this.saxSynth].forEach((node) => node?.dispose());
    this.drumVoices.forEach((voice) => voice.dispose());
    this.extraSynths.forEach((synth) => synth.dispose());
    this.gains.forEach((gain) => gain.dispose());
    this.reverbSend?.dispose();
    this.masterBus?.dispose();
    this.drumVoices.clear();
    this.extraSynths.clear();
    this.gains.clear();
    this.extraParts = [];
    this.sourcePlayer = null;
    this.bassSynth = null;
    this.saxSynth = null;
    this.drumLoop = null;
    this.bassLoop = null;
    this.saxPart = null;
    this.masterBus = null;
    this.reverbSend = null;
  }
}


function createNotePart(
  Tone: Tone,
  synth: import("tone").Synth,
  notes: NoteEvent[]
): import("tone").Part {
  const events = notes.map((note: NoteEvent) => ({
    time: `0:${note.start}`,
    note: note.pitch,
    duration: note.duration,
    velocity: note.velocity,
  }));
  return new Tone.Part((time, value) => {
    synth.triggerAttackRelease(value.note, `${value.duration}n`, time, value.velocity);
  }, events);
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
