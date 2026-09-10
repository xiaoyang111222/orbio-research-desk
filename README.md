# Orbio Research Desk

Self-funding crypto research desk agent for Orbio Build Week (https://orbio.so/build).

## What it does

1. Daily brief: OpenRouter web search to structured Zod output, optional Telegram (stdout fallback).
2. Orbio MCP self-funding module: dry-run plus HTTP stub against https://www.orbio.so/api/mcp.

Happy path needs only the OpenRouter API key env var. Telegram is optional.

## Build Week context

Orbio Build Week: 7 days, 10 winners. Builders claim an OpenRouter key through the Orbio MCP the same way an agent would.
This repo ships a research desk (tokenised equities / crypto) plus claim-rotate rails.

## How to run

Install dependencies then run the brief and fund status entrypoints.

## OpenRouter and Orbio gateway

Uses the openai SDK with an OpenAI-compatible base URL.

- Default: https://openrouter.ai/api/v1
- Orbio gateway: https://api.orbio.so/api/v1

Set OPENROUTER_BASE_URL to switch. Model ids stay OpenRouter-style.

## Orbio MCP story

Endpoint: https://www.orbio.so/api/mcp
Docs: https://orbio.so/mcp

Known tools: orbio_get_balance, orbio_create_key, orbio_claim_key, orbio_get_key_status, orbio_revoke_key.

Connect example:
claude mcp add --transport http --scope user orbio https://www.orbio.so/api/mcp

This repo defaults to dry-run fixtures. For live tools/call, authenticate, set ORBIO_MCP_TOKEN, and set ORBIO_MCP_DRY_RUN=0. Do not commit tokens.

## Telegram

Optional. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. Otherwise the brief prints to stdout.

## Layout

- src/lib/openrouter.ts — openai SDK client and raw fetch
- src/lib/telegram.ts — optional Telegram send
- src/lib/orbio-mcp.ts — MCP dry-run and HTTP stub
- src/cli/brief.ts — daily brief pipeline
- src/cli/fund-status.ts — funding CLI


## Daily brief (Build Week)

1. Gather source notes (the Orbio gateway does **not** support OpenRouter server-side `web_search`).
2. Write them to a file, then:

```bash
export RESEARCH_NOTES_FILE=./out/research-notes.md
npm run brief -- "Robinhood Chain ORBIO"
# or
npm run daily -- "Robinhood Chain ORBIO"
```

With `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `.env.local`, the brief is delivered to Telegram; otherwise it prints to stdout.

## Self-funding (Orbio MCP)

```bash
npm run fund:status   # balance + key (dry-run by default)
npm run fund:claim    # orbio_claim_key
npm run fund:rotate   # orbio_create_key (rotate)
npm run fund:probe    # HTTP probe of MCP endpoint
```

Live MCP: authenticate at https://orbio.so/mcp (or Claude Code `/mcp`), set `ORBIO_MCP_TOKEN`, and `ORBIO_MCP_DRY_RUN=0`. Until then dry-run fixtures stay on. The spend key for briefs is still `OPENROUTER_API_KEY` via `https://api.orbio.so/api/v1`.

## Chinese note

自筹算力的加密研究台：OpenRouter 做每日简报（搜索 + 结构化输出），Telegram 可选；默认 Orbio MCP dry-run 演示 claim/rotate，配置 token 后可访问真实 MCP 端点。

## Licence

MIT.
