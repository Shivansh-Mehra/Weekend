import 'dotenv/config'
import { mastra } from './src/mastra/index.ts'
import { getSpeechFileExtension } from './src/mastra/voice.ts'

async function main() {
  const [text, delayArgument] = process.argv.slice(2)
  const delayMs = Number(delayArgument ?? 10 * 60 * 1000)

  if (!text?.trim()) {
    throw new Error('Pass the reminder text as the first argument.')
  }
  if (!Number.isSafeInteger(delayMs) || delayMs < 0) {
    throw new Error('The delay must be a non-negative integer in milliseconds.')
  }

  const workflow = mastra.getWorkflow('checkInWorkflow')
  const outputPath = `check-in-reminder.${getSpeechFileExtension()}`
  const run = await workflow.createRun()
  const result = await run.start({
    inputData: {
      text,
      outputPath,
      delayMs,
    },
  })

  if (result.status !== 'success') {
    throw new Error(`Reminder workflow finished with status: ${result.status}`)
  }

  console.log(`Reminder audio saved to ${result.result.outputPath}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Could not start reminder: ${message}`)
  process.exitCode = 1
})