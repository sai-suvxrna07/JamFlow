"use client";

import { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Recorder } from "@/components/Recorder";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { Timeline } from "@/components/Timeline";
import { CommandBar } from "@/components/CommandBar";
import { DebugPanel, type DebugEntry } from "@/components/DebugPanel";
import { analyzeRecording, sendCommand } from "@/lib/api";
import { ArrangementPlayer } from "@/lib/playbackEngine";
import type { Arrangement, TrackOverrides } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [arrangement, setArrangement] = useState<Arrangement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<TrackOverrides>({});
  const [songLengthBars, setSongLengthBars] = useState(8);
  const [status, setStatus] = useState<"idle" | "analyzing" | "updating">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);
  const playerRef = useRef<ArrangementPlayer | null>(null);

  function logDebug(entry: Omit<DebugEntry, "time">) {
    setDebugLog((log) => [...log, { time: new Date().toLocaleTimeString(), ...entry }]);
  }

  async function handleRecordingComplete(blob: Blob) {
    setError(null);
    setStatus("analyzing");
    setAudioUrl(URL.createObjectURL(blob));
    try {
      const { arrangement: result } = await analyzeRecording(blob);
      setArrangement(result);
      logDebug({
        action: "analyze",
        status: "success",
        detail: JSON.stringify(result, null, 2),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      logDebug({ action: "analyze", status: "error", detail: message });
    } finally {
      setStatus("idle");
    }
  }

  async function handleCommand(instruction: string) {
    if (!arrangement) return;
    setError(null);
    setStatus("updating");
    setHistory((h) => [...h, instruction]);
    try {
      const { arrangement: result } = await sendCommand(
        instruction,
        arrangement,
        songLengthBars
      );
      setArrangement(result);
      logDebug({
        action: "command",
        status: "success",
        detail: `"${instruction}" →\n${JSON.stringify(result, null, 2)}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      logDebug({ action: "command", status: "error", detail: `"${instruction}" → ${message}` });
    } finally {
      setStatus("idle");
    }
  }

  async function handlePlay() {
    if (!arrangement) return;
    if (!playerRef.current) playerRef.current = new ArrangementPlayer();
    await playerRef.current.play(arrangement, audioUrl, overrides);
  }

  function handleStop() {
    playerRef.current?.stop();
  }

  function handleTempoChange(tempo: number) {
    if (!arrangement) return;
    setArrangement({ ...arrangement, tempo });
  }

  function handleToggleTrack(track: "drums" | "bass" | "saxophone") {
    if (!arrangement) return;
    const current = arrangement[track];
    if (!current) return;
    setArrangement({ ...arrangement, [track]: { ...current, enabled: !current.enabled } });
  }

  function handleStartOver() {
    playerRef.current?.stop();
    setArrangement(null);
    setAudioUrl(null);
    setOverrides({});
    setHistory([]);
    setError(null);
    setSongLengthBars(8);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="py-20">
          <h1 className="max-w-2xl">
            Play something. JamFlow builds the rest.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Record yourself playing anything — guitar, piano, vocals, drums —
            and tell your AI bandmate what to add next in plain language.
          </p>
          <div className="mt-8">
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              disabled={status !== "idle"}
            />
          </div>
          {status === "analyzing" && (
            <p className="mt-4 text-sm text-muted">Listening to your recording…</p>
          )}
          {error && <p className="mt-4 text-sm text-accent">{error}</p>}
        </section>

        {arrangement && (
          <section className="border-t border-line py-12">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={handlePlay}
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90"
                >
                  Play arrangement
                </button>
                <button
                  onClick={handleStop}
                  className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:border-foreground"
                >
                  Stop
                </button>
                <button
                  onClick={handleStartOver}
                  className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-foreground"
                >
                  Start over
                </button>
              </div>
              {status === "updating" && (
                <span className="text-sm text-muted">Updating arrangement…</span>
              )}
            </div>

            <div className="mt-10">
              <AnalysisPanel arrangement={arrangement} onTempoChange={handleTempoChange} />
            </div>

            <div className="mt-10">
              <Timeline
                arrangement={arrangement}
                overrides={overrides}
                onChange={setOverrides}
                onToggleTrack={handleToggleTrack}
                songLengthBars={songLengthBars}
                onSongLengthChange={setSongLengthBars}
              />
            </div>

            <div className="mt-10">
              <h2>Direct the arrangement</h2>
              <div className="mt-4">
                <CommandBar
                  onSubmit={handleCommand}
                  disabled={status !== "idle"}
                />
              </div>
              {history.length > 0 && (
                <ul className="mt-6 space-y-1 text-sm text-muted">
                  {history.map((item, i) => (
                    <li key={i}>— {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <DebugPanel entries={debugLog} apiUrl={API_URL} />
      </main>
      <footer className="border-t border-line py-8">
        <p className="mx-auto max-w-5xl px-6 text-sm text-muted">
          JamFlow — an AI bandmate and producer for musicians.
        </p>
      </footer>
    </div>
  );
}
