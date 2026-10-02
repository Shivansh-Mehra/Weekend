import 'dotenv/config'
import { init } from '@mastra/temporal'
import { Client, Connection } from '@temporalio/client'

const connection = Connection.lazy({
  address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
})

const client = new Client({
  connection,
  namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
})

export const { createWorkflow, createStep } = init({
  client,
  taskQueue: 'mastra',
})