import 'dotenv/config'
import { MastraPlugin } from '@mastra/temporal/worker'
import { NativeConnection, Worker } from '@temporalio/worker'

const connection = await NativeConnection.connect({
  address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
})

const worker = await Worker.create({
  connection,
  namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
  taskQueue: 'mastra',
  plugins: [new MastraPlugin(import.meta.resolve('./index.ts'))],
})

try {
  await worker.run()
} finally {
  await connection.close()
}