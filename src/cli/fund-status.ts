import { config } from 'dotenv'
import { getFundStatus, isDryRun, probeMcpEndpoint, claimOrRotateKey } from '../lib/orbio-mcp.js'

config({ path: ['.env.local', '.env'], quiet: true })

const args = new Set(process.argv.slice(2))

if (args.has('--probe')) {
  const probe = await probeMcpEndpoint()
  console.log(JSON.stringify({ probe, dryRun: isDryRun() }, null, 2))
  process.exit(0)
}

if (args.has('--claim') || args.has('--rotate')) {
  const result = await claimOrRotateKey({ rotate: args.has('--rotate') })
  const shown =
    result.mode === 'dry-run'
      ? result.apiKey
      : `${result.apiKey.slice(0, 8)}••••${result.apiKey.slice(-4)}`
  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        tool: result.tool,
        message: result.message,
        apiKey: shown,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const status = await getFundStatus()
console.log(JSON.stringify(status, null, 2))

if (status.mode === 'dry-run') {
  console.error(
    '\nDry-run mode. Set ORBIO_MCP_DRY_RUN=0 and ORBIO_MCP_TOKEN after authenticating to the Orbio MCP endpoint for live calls.',
  )
}
