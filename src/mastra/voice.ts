import { writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const execFileAsync = promisify(execFile)

export function getSpeechFileExtension(): 'mp3' | 'wav' {
  return getSpeechProvider() === 'elevenlabs' ? 'mp3' : 'wav'
}

export function prepareSpeechText(text: string): string {
  return text
    .replace(/^\s*(?:\*\*)?(?:INTERROGATE|ISOLATE|PLAN|EXECUTE)(?:\*\*)?\s*:\s*/gim, '')
    .replace(/^\s*(?:\*\*)?(?:ASSISTANT|ACCOUNTABILITY PARTNER)(?:\*\*)?\s*:\s*/gim, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const speechText = prepareSpeechText(text)
  if (!speechText) {
    throw new Error('Cannot synthesize an empty speech response.')
  }

  if (getSpeechProvider() === 'elevenlabs') {
    return synthesizeWithElevenLabs(speechText)
  }

  return synthesizeLocally(speechText)
}

function getSpeechProvider(): 'elevenlabs' | 'local' {
  const configuredProvider = process.env.TTS_PROVIDER?.toLowerCase()
  if (configuredProvider === 'local' || configuredProvider === 'elevenlabs') {
    return configuredProvider
  }

  return process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID
    ? 'elevenlabs'
    : 'local'
}

async function synthesizeWithElevenLabs(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) {
    throw new Error('TTS_PROVIDER=elevenlabs requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.')
  }

  try {
    const client = new ElevenLabsClient({ apiKey, maxRetries: 2 })
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: text.trim(),
      modelId: 'eleven_v3',
      outputFormat: 'mp3_44100_128',
    })
    const chunks: Uint8Array[] = []
    for await (const chunk of audioStream) {
      chunks.push(chunk)
    }
    if (chunks.length === 0) {
      throw new Error('ElevenLabs returned an empty audio response.')
    }
    return Buffer.concat(chunks)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`ElevenLabs text-to-speech failed: ${detail}`, { cause: error })
  }
}

async function synthesizeLocally(text: string): Promise<Buffer> {
  if (process.platform !== 'win32') {
    throw new Error('Local speech synthesis currently requires Windows PowerShell and System.Speech.')
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const inputPath = join(tmpdir(), `accountability-${id}.txt`)
  const outputPath = join(tmpdir(), `accountability-${id}.wav`)
  const script = String.raw`
$outputPath = $env:ACCOUNTABILITY_OUTPUT_PATH
$inputPath = $env:ACCOUNTABILITY_INPUT_PATH
Add-Type -AssemblyName System.Speech
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synthesizer.SetOutputToWaveFile($outputPath)
  $synthesizer.Speak((Get-Content -Raw -LiteralPath $inputPath))
} finally {
  $synthesizer.Dispose()
}
`

  try {
    await writeFile(inputPath, text.trim(), 'utf8')
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script,
    ], {
      env: {
        ...process.env,
        ACCOUNTABILITY_OUTPUT_PATH: outputPath,
        ACCOUNTABILITY_INPUT_PATH: inputPath,
      },
    })
    return await readFile(outputPath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Local text-to-speech failed: ${detail}`, { cause: error })
  } finally {
    await Promise.all([
      rm(inputPath, { force: true }),
      rm(outputPath, { force: true }),
    ])
  }
}