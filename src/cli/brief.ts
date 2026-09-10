/** Daily crypto research brief CLI. */
import { config } from 'dotenv'
import { z } from 'zod'
import { DEFAULT_MODEL, openrouterFetch } from '../lib/openrouter.js'
import { getTelegramConfig, sendTelegramMessage } from '../lib/telegram.js'

config({ path: ['.env.local', '.env'], quiet: true })

const Brief = z.object({
  headline: z.string(),
  summary: z.string(),
  bullets: z.array(z.string()),
  risks: z.array(z.string()),
  sources: z.array(z.string().url()),
})

export type DailyBrief = z.infer<typeof Brief>

const topic =
  process.argv.slice(2).join(' ').trim() ||
  process.env.BRIEF_TOPIC?.trim() ||
  'tokenised equities crypto markets Robinhood Chain'

async function research(topicText: string): Promise<string> {
  // Orbio gateway rejects OpenRouter server-side tools (web_search). Prefer
  // injected notes, then a plain model pass (no server tools).
  const injected = process.env.RESEARCH_NOTES?.trim()
  if (injected) return injected

  const notesFile = process.env.RESEARCH_NOTES_FILE?.trim()
  if (notesFile) {
    const { readFile } = await import('node:fs/promises')
    return (await readFile(notesFile, 'utf8')).trim()
  }

  const res = await openrouterFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a crypto research desk. Summarize the last 24-48h for the topic. Only cite URLs you are confident exist; if unsure, omit. Be concrete.',
        },
        {
          role: 'user',
          content: `Topic: ${topicText}\n\nProduce research notes with named facts, numbers, and source URLs when known.`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`research ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as {
    choices: Array<{ message: { content: string | null } }>
  }
  return body.choices[0]?.message?.content ?? ''
}

async function shape(notes: string): Promise<DailyBrief> {
  const res = await openrouterFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Turn research notes into a daily desk brief. Only use URLs present in the notes, one per entry, verbatim. Be precise and concrete.',
        },
        { role: 'user', content: notes },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'daily_brief',
          strict: true,
          schema: z.toJSONSchema(Brief),
        },
      },
      provider: { require_parameters: true },
    }),
  })
  if (!res.ok) throw new Error(`shape ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as {
    choices: Array<{ message: { content: string | null } }>
  }
  const raw = body.choices[0]?.message?.content ?? '{}'
  return Brief.parse(JSON.parse(raw))
}

function formatBrief(brief: DailyBrief, topicText: string): string {
  const lines = [
    `Orbio Research Desk — ${new Date().toISOString().slice(0, 10)}`,
    `Topic: ${topicText}`,
    '',
    `# ${brief.headline}`,
    '',
    brief.summary,
    '',
    'Bullets:',
    ...brief.bullets.map((b) => `- ${b}`),
    '',
    'Risks:',
    ...brief.risks.map((r) => `- ${r}`),
    '',
    'Sources:',
    ...brief.sources.map((s) => `  ${s}`),
  ]
  return lines.join('\n')
}

async function deliver(text: string): Promise<'telegram' | 'stdout'> {
  if (getTelegramConfig()) {
    await sendTelegramMessage(text, { disableLinkPreview: true })
    return 'telegram'
  }
  console.log(text)
  return 'stdout'
}

const notes = await research(topic)
if (!notes.trim()) throw new Error('Research step returned empty notes.')

const brief = await shape(notes)
const text = formatBrief(brief, topic)
const channel = await deliver(text)

if (channel === 'telegram') {
  console.log('Brief delivered to Telegram.')
  console.log(
    JSON.stringify({ headline: brief.headline, sources: brief.sources.length }, null, 2),
  )
} else {
  console.error(
    '\n(Telegram not configured — printed to stdout. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID to deliver.)',
  )
}
