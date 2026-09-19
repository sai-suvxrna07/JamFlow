import type {
  AnalyzeResponse,
  Arrangement,
  CommandResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyzeRecording(
  audio: Blob
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("audio", audio, "recording.webm");

  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Analyze request failed: ${res.status}`);
  }

  return res.json();
}

export async function sendCommand(
  instruction: string,
  arrangement: Arrangement
): Promise<CommandResponse> {
  const res = await fetch(`${API_URL}/api/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, arrangement }),
  });

  if (!res.ok) {
    throw new Error(`Command request failed: ${res.status}`);
  }

  return res.json();
}
