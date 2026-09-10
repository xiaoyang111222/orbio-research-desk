/**
 * Daily desk runner for Build Week.
 *
 * Expects RESEARCH_NOTES or RESEARCH_NOTES_FILE (assembled by the operator /
 * routine), then shapes + delivers via brief pipeline pieces.
 * Prefer: `npm run brief` with RESEARCH_NOTES_FILE set after gathering sources.
 *
 * This entrypoint:
 * 1) prints fund status (dry-run or live)
 * 2) runs the brief CLI logic by spawning the same module path
 * 3) exits non-zero if brief fails
 */
import { config } from 'dotenv'
import { spawn } from 'node:child_process'
import { getFundStatus } from '../lib/orbio-mcp.js'

config({ path: ['.env.local', '.env'], quiet: true })

const status = await getFundStatus()
console.log(
  JSON.stringify(
    {
      fund: {
        mode: status.mode,
        availableUsd: status.balance.availableUsd,
        keyPresent: status.key.present,
        keyMasked: status.key.masked,
      },
    },
    null,
    2,
  ),
)

const topic = process.argv.slice(2).join(' ').trim()
const args = ['tsx', 'src/cli/brief.ts']
if (topic) args.push(topic)

const child = spawn('npx', args, {
  stdio: 'inherit',
  env: process.env,
  cwd: new URL('../..', import.meta.url).pathname,
})

const code: number = await new Promise((resolve) => {
  child.on('exit', (c) => resolve(c ?? 1))
})
process.exit(code)
