"""Thin wrapper around the Gemini API for musical analysis and arrangement edits."""

import os
import time

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.schemas import Arrangement

MODEL = "gemini-3.6-flash"
MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = 2
RETRY_BACKOFF_MAX_SECONDS = 15

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env "
                "and add your key."
            )
        _client = genai.Client(api_key=api_key)
    return _client


ANALYZE_PROMPT = """You are the ears of an AI bandmate and producer. Listen to this \
recording of a musician playing an instrument (any instrument or voice — guitar, \
piano, vocals, violin, drums, etc.) and describe it as structured musical data: \
identify the instrument being played, approximate tempo (BPM), likely key/tonal \
center, time signature, overall energy, and musical style/feel. Also decide a \
sensible starting arrangement: leave drums, bass, and saxophone disabled (the \
musician will ask for them explicitly), leave `extra_instruments` as an empty list, \
but set style/role fields to sensible defaults so they're ready to be turned on \
later. Write a one-sentence, plain-language summary of what you heard in the \
`notes` field."""

COMMAND_PROMPT_TEMPLATE = """You are the producer half of an AI bandmate. The \
musician recorded a part, and Gemini already analyzed it into the arrangement state \
below. The musician just gave you a new instruction in plain language. Update the \
arrangement to reflect it and return the FULL updated arrangement (not a diff).

Rules:
- For drums and bass, describe them with a short style descriptor and an intensity \
from 0 to 1.
- For saxophone, generate actual note-level data (pitch, start beat, duration in \
beats, velocity) that fits the key, tempo, and requested role (e.g. call and \
response with the original recording means the sax plays in the gaps, not on top).
- If the instruction asks for an instrument other than drums, bass, or saxophone \
(e.g. "add piano", "add strings"), or if the song's style would clearly benefit from \
one, add it to `extra_instruments` with note-level data just like saxophone. Don't \
add extra instruments the musician didn't ask for unless it's a clear stylistic fit.
- Only change what the instruction asks for; keep everything else the same unless \
the instruction implies a broader change (e.g. "make this darker" may affect key, \
style, and multiple instruments).{length_instruction}
- Set `notes` to a short plain-language summary of what changed.

Current arrangement (JSON):
{arrangement_json}

Musician's instruction: "{instruction}"
"""


def _generate_with_retry(**kwargs) -> types.GenerateContentResponse:
    client = get_client()
    for attempt in range(MAX_RETRIES):
        try:
            return client.models.generate_content(**kwargs)
        except genai_errors.ServerError:
            if attempt == MAX_RETRIES - 1:
                raise
            backoff = min(RETRY_BACKOFF_SECONDS * (2**attempt), RETRY_BACKOFF_MAX_SECONDS)
            time.sleep(backoff)


def analyze_recording(audio_bytes: bytes, mime_type: str) -> Arrangement:
    response = _generate_with_retry(
        model=MODEL,
        contents=[
            ANALYZE_PROMPT,
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Arrangement,
        ),
    )
    return response.parsed


def interpret_command(
    instruction: str, arrangement: Arrangement, song_length_bars: int | None = None
) -> Arrangement:
    length_instruction = ""
    if song_length_bars is not None:
        length_instruction = (
            f"\n- The musician wants the song to be {song_length_bars} bars long "
            "(4 beats per bar). Generate note-level parts (saxophone, extra_instruments) "
            "that fill that length rather than looping a short idea, unless the "
            "instruction says otherwise."
        )
    prompt = COMMAND_PROMPT_TEMPLATE.format(
        arrangement_json=arrangement.model_dump_json(indent=2),
        instruction=instruction,
        length_instruction=length_instruction,
    )
    response = _generate_with_retry(
        model=MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Arrangement,
        ),
    )
    return response.parsed
