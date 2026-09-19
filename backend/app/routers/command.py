from fastapi import APIRouter, HTTPException
from google.genai import errors as genai_errors

from app.gemini_client import interpret_command
from app.schemas import CommandRequest, CommandResponse

router = APIRouter()


@router.post("/command", response_model=CommandResponse)
async def command(request: CommandRequest) -> CommandResponse:
    try:
        arrangement = interpret_command(request.instruction, request.arrangement)
    except genai_errors.ClientError as exc:
        if exc.code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gemini's free-tier daily quota is exhausted for this model. "
                "Wait for the daily reset or enable billing on your Google AI Studio project.",
            ) from exc
        raise HTTPException(status_code=502, detail=f"Gemini rejected the request: {exc.message}") from exc
    except genai_errors.ServerError as exc:
        raise HTTPException(status_code=503, detail="Gemini is temporarily overloaded, try again") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if arrangement is None:
        raise HTTPException(status_code=502, detail="Gemini did not return a valid arrangement")

    return CommandResponse(arrangement=arrangement)
