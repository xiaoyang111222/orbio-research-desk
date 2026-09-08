import { config } from 'dotenv'
import OpenAI from 'openai'

// `.env.local` first, `.env` as a fallback.
config({ path: ['.env.local', '.env'], quiet: true })

/**
 * One client, one key.
 *
 * OpenRouter speaks the OpenAI wire format, so the official `openai` SDK works
 * unchanged with a different base URL. The key is the one Orbio minted for you
 * — claim it through the Orbio MCP (`orbio_create_key` / `orbio_claim_key`) or
 * on the dashboard, put it in `.env.local`, and the brief pipeline runs on it.
 *
 * Base URL options:
 *   - https://openrouter.ai/api/v1  (default, direct OpenRouter)
 *   - https://api.orbio.so/api/v1   (Orbio gateway — same OpenAI-compatible surface)
 */
const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  throw new Error(
    'OPENROUTER_API_KEY is not set. Claim a key on Orbio, then copy .env.example to .env.local.',
  )
}

export const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1'

export const ORBIO_GATEWAY_BASE_URL = 'https://api.orbio.so/api/v1'

export const openrouter = new OpenAI({
  apiKey,
  baseURL: OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL ?? 'https://orbio.so/build',
    'X-Title': process.env.APP_NAME ?? 'Orbio Research Desk',
  },
})

/** Raw fetch against the same base, for endpoints the SDK does not model. */
export const openrouterFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${OPENROUTER_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

/**
 * A sensible default. Swap freely — any model on openrouter.ai/models works,
 * and `openrouter/auto` lets the router pick per request.
 */
export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'
