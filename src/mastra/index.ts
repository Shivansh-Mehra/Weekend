import { Mastra } from '@mastra/core'
import { accountabilityAgent } from './agents/accountability.ts'
import { checkInWorkflow } from './workflows/index.ts'

export const mastra = new Mastra({
  agents: { accountabilityAgent },
  workflows: { checkInWorkflow },
})