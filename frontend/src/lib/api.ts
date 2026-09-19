import type {
  AnalyzeResponse,
  Arrangement,
  CommandResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // response wasn't JSON, fall through to a generic message
  }
  return `Request failed with status ${res.status}`;
}

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
    throw new Error(await readErrorDetail(res));
  }

  return res.json();
}

export async function sendCommand(
  instruction: string,
  arrangement: Arrangement,
  songLengthBars: number | null = null
): Promise<CommandResponse> {
  const res = await fetch(`${API_URL}/api/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction,
      arrangement,
      song_length_bars: songLengthBars,
    }),
  });

  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }


  return res.json();
}
