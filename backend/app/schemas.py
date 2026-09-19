"""Pydantic models describing the shared arrangement state.

This mirrors frontend/src/lib/types.ts — keep both in sync when changing fields.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Energy = Literal["low", "medium", "high"]


class NoteEvent(BaseModel):
    pitch: str = Field(description="Note name and octave, e.g. 'A3'")
    start: float = Field(description="Start position in beats from arrangement start")
    duration: float = Field(description="Duration in beats")
    velocity: float = Field(description="Loudness from 0 to 1", ge=0, le=1)


class RhythmSectionTrack(BaseModel):
    """Descriptor-based track for rhythm section instruments (drums, bass)."""

    enabled: bool
    style: str = Field(description="Short style descriptor, e.g. 'light groove'")
    intensity: float = Field(description="Intensity from 0 to 1", ge=0, le=1)


class MelodicTrack(BaseModel):
    """Note-level track for melodic instruments (saxophone, etc.)."""

    enabled: bool
    role: str = Field(
        description="How this instrument relates to the recording, e.g. "
        "'call_and_response', 'lead', 'pad'"
    )
    notes: list[NoteEvent] = Field(default_factory=list)


class ExtraInstrument(BaseModel):
    """An additional instrument Gemini decides fits the song (piano, strings, synth, etc.)."""

    name: str = Field(description="Instrument name, e.g. 'piano', 'strings', 'synth pad'")
    role: str = Field(description="How it fits the arrangement, e.g. 'pad', 'lead', 'accent'")
    notes: list[NoteEvent] = Field(default_factory=list)


class Arrangement(BaseModel):
    tempo: int = Field(description="Tempo in BPM")
    key: str = Field(description="Key / tonal center, e.g. 'A minor'")
    time_signature: str = Field(default="4/4")
    energy: Energy
    style: str = Field(description="Overall musical style/feel")
    instrument: str = Field(
        default="instrument",
        description="The instrument heard in the original recording, e.g. 'electric guitar', 'piano', 'vocals'",
    )
    drums: Optional[RhythmSectionTrack] = None
    bass: Optional[RhythmSectionTrack] = None
    saxophone: Optional[MelodicTrack] = None
    extra_instruments: list[ExtraInstrument] = Field(
        default_factory=list,
        description="Additional instruments beyond drums/bass/saxophone that suit the song's style",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Short human-readable summary of the latest analysis or change",
    )


class AnalyzeResponse(BaseModel):
    arrangement: Arrangement


class CommandRequest(BaseModel):
    instruction: str
    arrangement: Arrangement
    song_length_bars: Optional[int] = Field(
        default=None,
        description="Desired total song length in bars, if the musician has set one",
    )


class CommandResponse(BaseModel):
    arrangement: Arrangement
