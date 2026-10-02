# Build for a Friend

A private, voice-first accountability agent built with Mastra, Ollama, optional ElevenLabs TTS, and Temporal.

## Setup

Use Node.js 22.18 or newer. Install the project dependencies with:

```powershell
npm install
```

The equivalent explicit dependency install is:

```powershell
npm install @mastra/core@latest zod@latest @mastra/temporal@latest @temporalio/client@latest @temporalio/worker@latest @elevenlabs/elevenlabs-js@latest ollama-ai-provider-v2 dotenv
npm install -D typescript@latest tsx@latest @types/node@latest
```

Install [Ollama](https://ollama.com/) and pull the local model:

```powershell
ollama run gemma:2b
```

Copy `.env.example` to `.env`. Set `TTS_PROVIDER=local` for offline Windows speech. Set `TTS_PROVIDER=elevenlabs` and provide `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for realistic cloud voice output.

## Run the agent and voice demo

```powershell
npm.cmd run test:agent -- "I have three exams next week and I cannot start studying."
```

The agent asks about the blocker, isolates a tiny action, and writes the spoken response to `check-in.wav` or `check-in.mp3` depending on `TTS_PROVIDER`. The CLI then waits for your report-back and creates the matching follow-up audio. Use `--once` to skip the report-back prompt.

## Run the Temporal reminder workflow

Start a local Temporal development server in one terminal:

```powershell
temporal server start-dev
```

Start the worker in another terminal:

```powershell
npm run worker
```

Start a reminder with a message and a delay in milliseconds (for example, ten minutes):

```powershell
npm.cmd run start:reminder -- "You have been quiet. What is one tiny next step?" 600000
```

The local WAV reminder is written by the worker after the durable timer expires.

## Validate

```powershell
npm run typecheck
```