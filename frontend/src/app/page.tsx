"use client";

import { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Recorder } from "@/components/Recorder";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ArrangementTrackList } from "@/components/ArrangementTrackList";
import { CommandBar } from "@/components/CommandBar";
import { analyzeRecording, sendCommand } from "@/lib/api";
import { ArrangementPlayer } from "@/lib/playbackEngine";
import type { Arrangement } from "@/lib/types";

export default function Home() {
  const [arrangement, setArrangement] = useState<Arrangement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "updating">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const playerRef = useRef<ArrangementPlayer | null>(null);

  async function handleRecordingComplete(blob: Blob) {
    setError(null);
    setStatus("analyzing");
    setAudioUrl(URL.createObjectURL(blob));
    try {
      const { arrangement: result } = await analyzeRecording(blob);
      setArrangement(result);
    } catch {
      setError("Could not analyze the recording. Try again.");
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
        arrangement
      );
      setArrangement(result);
    } catch {
      setError("Could not update the arrangement. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function handlePlay() {
    if (!arrangement) return;
    if (!playerRef.current) playerRef.current = new ArrangementPlayer();
    await playerRef.current.play(arrangement, audioUrl);
  }

  function handleStop() {
    playerRef.current?.stop();
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
            Record a riff, and tell your AI bandmate what to add next — drums,
            bass, a saxophone response — all in plain language.
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
              </div>
              {status === "updating" && (
                <span className="text-sm text-muted">Updating arrangement…</span>
              )}
            </div>

            <div className="mt-10">
              <AnalysisPanel arrangement={arrangement} />
            </div>

            <div className="mt-10">
              <ArrangementTrackList arrangement={arrangement} />
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
      </main>
      <footer className="border-t border-line py-8">
        <p className="mx-auto max-w-5xl px-6 text-sm text-muted">
          JamFlow — an AI bandmate and producer for musicians.
        </p>
      </footer>
    </div>
  );
}
