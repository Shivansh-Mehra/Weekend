import { writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { createStep, createWorkflow } from '../temporal/index.ts'
import { synthesizeSpeech } from '../voice.ts'

const reminderInputSchema = z.object({
  text: z.string().min(1),
  outputPath: z.string().min(1),
  delayMs: z.number().int().nonnegative(),
})

const reminderOutputSchema = z.object({
  outputPath: z.string(),
})

const generateReminderStep = createStep({
  id: 'generate-audio-reminder',
  inputSchema: reminderInputSchema,
  outputSchema: reminderOutputSchema,
  execute: async ({ inputData }) => {
    const audio = await synthesizeSpeech(inputData.text)
    await writeFile(inputData.outputPath, audio)
    return { outputPath: inputData.outputPath }
  },
})

export const checkInWorkflow = createWorkflow({
  id: 'check-in-workflow',
  inputSchema: reminderInputSchema,
  outputSchema: reminderOutputSchema,
})
  .sleep(async ({ inputData }) => inputData.delayMs)
  .then(generateReminderStep)
  .commit()