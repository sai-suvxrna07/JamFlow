from fastapi import APIRouter, HTTPException, UploadFile
from google.genai import errors as genai_errors

from app.gemini_client import analyze_recording
from app.schemas import AnalyzeResponse

router = APIRouter()

ALLOWED_MIME_TYPES = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(audio: UploadFile) -> AnalyzeResponse:
    mime_type = audio.content_type or "audio/webm"
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {mime_type}")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received")

    try:
        arrangement = analyze_recording(audio_bytes, mime_type)
    except genai_errors.ServerError as exc:
        raise HTTPException(status_code=503, detail="Gemini is temporarily overloaded, try again") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if arrangement is None:
        raise HTTPException(status_code=502, detail="Gemini did not return a valid arrangement")

    return AnalyzeResponse(arrangement=arrangement)
