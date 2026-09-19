from fastapi import APIRouter, HTTPException

from app.gemini_client import interpret_command
from app.schemas import CommandRequest, CommandResponse

router = APIRouter()


@router.post("/command", response_model=CommandResponse)
async def command(request: CommandRequest) -> CommandResponse:
    try:
        arrangement = interpret_command(request.instruction, request.arrangement)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if arrangement is None:
        raise HTTPException(status_code=502, detail="Gemini did not return a valid arrangement")

    return CommandResponse(arrangement=arrangement)
