/**
 * Orbio MCP client — claim / rotate keys so the desk can self-fund.
 *
 * Remote MCP: https://www.orbio.so/api/mcp
 * Docs: https://orbio.so/mcp
 *
 * Tools:
 *   orbio_get_balance, orbio_create_key, orbio_claim_key,
 *   orbio_get_key_status, orbio_revoke_key
 *
 * Default mode is dry-run (no network). Set ORBIO_MCP_DRY_RUN=0 and
 * ORBIO_MCP_TOKEN to call the live HTTP JSON-RPC endpoint.
 */

import { z } from 'zod'

export const ORBIO_MCP_DEFAULT_URL = 'https://www.orbio.so/api/mcp'

export const OrbioMcpTools = [
  'orbio_get_balance',
  'orbio_create_key',
  'orbio_claim_key',
  'orbio_get_key_status',
  'orbio_revoke_key',
] as const

export type OrbioMcpTool = (typeof OrbioMcpTools)[number]

export type FundStatus = {
  mode: 'dry-run' | 'live'
  endpoint: string
  authenticated: boolean
  balance: {
    availableUsd: number
    pendingUsd: number
    note: string
  }
  key: {
    present: boolean
    masked: string | null
    status: 'unknown' | 'active' | 'spent' | 'revoked' | 'dry-run'
    spendUsd: number | null
    limitUsd: number | null
  }
  docs: {
    mcpPage: string
    connect: string
    tools: readonly string[]
  }
  raw?: unknown
}

export type ClaimKeyResult = {
  mode: 'dry-run' | 'live'
  tool: OrbioMcpTool
  apiKey: string
  message: string
  raw?: unknown
}

const JsonRpcSuccess = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).nullable().optional(),
  result: z.unknown(),
})

const JsonRpcError = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).nullable().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
})

function mcpUrl(): string {
  return process.env.ORBIO_MCP_URL?.trim() || ORBIO_MCP_DEFAULT_URL
}

function mcpToken(): string | undefined {
  return process.env.ORBIO_MCP_TOKEN?.trim() || undefined
}

/** Dry-run unless explicitly disabled AND a token is present. */
export function isDryRun(): boolean {
  const flag = process.env.ORBIO_MCP_DRY_RUN?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'no') {
    return !mcpToken()
  }
  return true
}

let rpcId = 1

async function mcpRpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const token = mcpToken()
  if (!token) {
    throw new Error(
      'ORBIO_MCP_TOKEN is required for live MCP calls. Keep ORBIO_MCP_DRY_RUN=1, or authenticate against https://www.orbio.so/api/mcp and set a bearer.',
    )
  }

  const body = {
    jsonrpc: '2.0' as const,
    id: rpcId++,
    method,
    params,
  }

  const res = await fetch(mcpUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Orbio MCP HTTP ${res.status}: ${text.slice(0, 500)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const dataLine = text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'))
    if (!dataLine) throw new Error(`Orbio MCP returned non-JSON: ${text.slice(0, 300)}`)
    parsed = JSON.parse(dataLine.replace(/^data:\s*/, ''))
  }

  const err = JsonRpcError.safeParse(parsed)
  if (err.success) {
    throw new Error(`Orbio MCP RPC error ${err.data.error.code}: ${err.data.error.message}`)
  }

  const ok = JsonRpcSuccess.safeParse(parsed)
  if (!ok.success) return parsed
  return ok.data.result
}

/** HTTP stub: tools/call against the remote MCP (live mode only). */
export async function callOrbioTool(
  name: OrbioMcpTool,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  if (isDryRun()) {
    return dryRunTool(name, args)
  }
  return mcpRpc('tools/call', { name, arguments: args })
}

function dryRunTool(name: OrbioMcpTool, args: Record<string, unknown>): unknown {
  const now = new Date().toISOString()
  switch (name) {
    case 'orbio_get_balance':
      return {
        dryRun: true,
        at: now,
        availableUsd: 100,
        pendingUsd: 0,
        note: 'Fixture balance for Build Week dry-run ($100 grant shape).',
      }
    case 'orbio_create_key':
    case 'orbio_claim_key':
      return {
        dryRun: true,
        at: now,
        tool: name,
        apiKey: 'sk-or-v1-DRYRUN-not-a-real-key',
        limitUsd: 200,
        args,
        note: 'Dry-run claim/rotate. Wire ORBIO_MCP_TOKEN for a real key.',
      }
    case 'orbio_get_key_status':
      return {
        dryRun: true,
        at: now,
        status: 'dry-run',
        spendUsd: 0,
        limitUsd: 200,
        masked: 'sk-or-v1-••••DRYRUN',
      }
    case 'orbio_revoke_key':
      return {
        dryRun: true,
        at: now,
        revoked: true,
        args,
        note: 'Dry-run revoke — no key was changed.',
      }
    default: {
      const _exhaustive: never = name
      return _exhaustive
    }
  }
}

function maskKey(key: string | undefined): string | null {
  if (!key) return null
  if (key.length < 12) return '••••'
  return `${key.slice(0, 8)}••••${key.slice(-4)}`
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  return null
}

function unwrapMcp(raw: unknown): Record<string, unknown> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const structured = obj.structuredContent
  if (structured && typeof structured === 'object') return structured as Record<string, unknown>
  return obj
}

function normalizeBalance(raw: unknown): FundStatus['balance'] {
  const obj = unwrapMcp(raw)
  const bal = obj.balance
  const balObj = bal && typeof bal === 'object' ? (bal as Record<string, unknown>) : null
  const available =
    num(obj.availableUsd) ??
    num(obj.available) ??
    (balObj ? num(balObj.usd) : null) ??
    num(obj.balance) ??
    num(obj.credits) ??
    0
  const pending = num(obj.pendingUsd) ?? num(obj.pending) ?? 0
  const content = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).content : null) as
    | Array<{ type?: string; text?: string }>
    | null
  const noteText = content?.find((c) => c?.type === 'text' && c.text)?.text
  return {
    availableUsd: available,
    pendingUsd: pending,
    note: String(noteText ?? obj.note ?? 'Live balance from Orbio MCP.'),
  }
}

function normalizeKey(raw: unknown, localKey: string | undefined): FundStatus['key'] {
  const obj = unwrapMcp(raw)
  const statusRaw = String(obj.status ?? (obj.hasKey ? 'active' : 'unknown'))
  const allowed = ['unknown', 'active', 'spent', 'revoked', 'dry-run'] as const
  const status = (allowed as readonly string[]).includes(statusRaw)
    ? (statusRaw as FundStatus['key']['status'])
    : 'unknown'
  const prefix = typeof obj.prefix === 'string' ? obj.prefix : null
  return {
    present: Boolean(localKey) || Boolean(obj.hasKey) || Boolean(obj.masked ?? obj.key ?? prefix),
    masked: maskKey(localKey) ?? (typeof obj.masked === 'string' ? obj.masked : prefix),
    status,
    spendUsd: num(obj.spendUsd) ?? num(obj.spent) ?? null,
    limitUsd: num(obj.limitUsd) ?? num(obj.limit) ?? null,
  }
}

export async function getFundStatus(): Promise<FundStatus> {
  const endpoint = mcpUrl()
  const dry = isDryRun()
  const localKey = process.env.OPENROUTER_API_KEY?.trim()
  const docs = {
    mcpPage: 'https://orbio.so/mcp',
    connect: 'claude mcp add --transport http --scope user orbio https://www.orbio.so/api/mcp',
    tools: OrbioMcpTools,
  } as const

  if (dry) {
    const balance = (await callOrbioTool('orbio_get_balance')) as {
      availableUsd: number
      pendingUsd: number
      note: string
    }
    const keyStatus = (await callOrbioTool('orbio_get_key_status')) as {
      status: FundStatus['key']['status']
      spendUsd: number
      limitUsd: number
      masked: string
    }
    return {
      mode: 'dry-run',
      endpoint,
      authenticated: false,
      balance: {
        availableUsd: balance.availableUsd,
        pendingUsd: balance.pendingUsd,
        note: balance.note,
      },
      key: {
        present: Boolean(localKey),
        masked: maskKey(localKey) ?? keyStatus.masked,
        status: localKey ? 'active' : keyStatus.status,
        spendUsd: keyStatus.spendUsd,
        limitUsd: keyStatus.limitUsd,
      },
      docs,
      raw: { balance, keyStatus },
    }
  }

  const balanceRaw = await callOrbioTool('orbio_get_balance')
  const keyRaw = await callOrbioTool('orbio_get_key_status')

  return {
    mode: 'live',
    endpoint,
    authenticated: true,
    balance: normalizeBalance(balanceRaw),
    key: normalizeKey(keyRaw, localKey),
    docs,
    raw: { balanceRaw, keyRaw },
  }
}

/** Claim or rotate a spend key (dry-run by default). */
export async function claimOrRotateKey(
  opts: { rotate?: boolean } = {},
): Promise<ClaimKeyResult> {
  const tool: OrbioMcpTool = opts.rotate ? 'orbio_create_key' : 'orbio_claim_key'
  const raw = await callOrbioTool(tool, opts.rotate ? { rotate: true } : {})
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let apiKey = 'sk-or-v1-unavailable'
  if (typeof obj.apiKey === 'string') apiKey = obj.apiKey
  else if (typeof obj.key === 'string') apiKey = obj.key
  return {
    mode: isDryRun() ? 'dry-run' : 'live',
    tool,
    apiKey,
    message: String(
      obj.note ??
        (opts.rotate
          ? 'Created a fresh key (old secret stops per Orbio MCP).'
          : 'Claimed a key against your Orbio balance.'),
    ),
    raw,
  }
}

/** Probe the MCP HTTP endpoint without auth (expects 401). */
export async function probeMcpEndpoint(): Promise<{ status: number; body: string }> {
  const res = await fetch(mcpUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'orbio-research-desk', version: '0.1.0' },
      },
    }),
  })
  return { status: res.status, body: (await res.text()).slice(0, 300) }
}
