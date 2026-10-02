import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { writeFile } from 'node:fs/promises'
import { mastra } from './src/mastra/index.ts'
import { getSpeechFileExtension, prepareSpeechText, synthesizeSpeech } from './src/mastra/voice.ts'

async function main() {
  const args = process.argv.slice(2)
  const once = args.includes('--once')
  const prompt = args.filter((argument) => argument !== '--once').join(' ').trim()
    || 'I am frozen and need help getting started.'

  const agent = mastra.getAgentById('accountability-agent')
  const response = await agent.generate(`The user has started an accountability check-in and said: "${prompt}". Ask them one short question about what is wrong or blocking them. Do not give a solution yet. Use plain conversational sentences with no labels or headings.`)
  const text = prepareSpeechText(response.text)

  if (!text) {
    throw new Error('The accountability agent returned an empty response.')
  }

  console.log(text)
  const extension = getSpeechFileExtension()
  const checkInPath = `check-in.${extension}`
  await writeFile(checkInPath, await synthesizeSpeech(text))
  console.log(`Saved voice check-in to ${checkInPath}`)

  if (once) {
    return
  }

  const readline = createInterface({ input, output })
  try {
    const blocker = await readline.question('Your answer: ')
    if (!blocker.trim()) {
      return
    }

    const solution = await agent.generate(`The user's blocker is: "${blocker.trim()}". Respond with exactly two short sentences. First acknowledge the blocker. Second sentence must start with "For the next 10 minutes," and give one concrete physical action they can do now. Do not ask a question. Do not discuss feelings, possibilities, or worst cases. Do not simulate a reply. Do not use labels, headings, bullets, or markdown.`)
    const solutionText = prepareSpeechText(solution.text)
    if (!solutionText) {
      throw new Error('The accountability agent returned an empty solution.')
    }

    console.log(solutionText)
    const solutionPath = `solution.${extension}`
    await writeFile(solutionPath, await synthesizeSpeech(solutionText))
    console.log(`Saved voice solution to ${solutionPath}`)
  } finally {
    readline.close()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Check-in failed: ${message}`)
  process.exitCode = 1
})