# JamFlow
We’re building an interactive music production website that lets musicians improvise with an AI bandmate in real time.

A musician can simply pick up their guitar and start playing—whether they are practicing a scale, playing a riff, or improvising. Instead of requiring them to manually program drums, bass, chords, and other instruments, the system listens to their performance and uses Gemini to interpret the musical context, including the player's rhythm, tempo, energy, and direction. It then adapts the accompanying instruments to match their flow.

The musician can also use natural voice commands while playing, such as “add bass,” “make the drums more energetic,” “drop the drums,” or “add strings.” Gemini interprets these commands in the context of the current performance and translates them into changes to the arrangement.

The goal is to make music creation feel less like operating a DAW and more like playing with a real band. Instead of stopping to program every part, musicians can focus on playing and let the AI respond to them.

Gemini is central to the interaction loop: it interprets both the musician’s audio and natural-language instructions, determines how the virtual ensemble should respond, and drives changes in the musical arrangement.

## Project structure

- `frontend/` — Next.js + Tailwind app. SoundCloud-style recording UI, Tone.js-based playback engine.
- `backend/` — FastAPI service. Wraps the Gemini API for audio analysis (`/api/analyze`) and natural-language arrangement edits (`/api/command`).

## Running locally

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your GEMINI_API_KEY
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000, click Start Recording, play something, then use natural-language commands to build out the arrangement.

## Deployment

- Frontend deploys to Vercel (root directory `frontend/`).
- Backend deploys to any Python host that supports FastAPI/ASGI (e.g. Render, Fly.io); point `NEXT_PUBLIC_API_URL` at it.

