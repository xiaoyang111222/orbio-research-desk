# Orbio Research Desk

**Orbio Build Week entry** — a self-funding crypto research desk that keeps itself on Orbio rails.

> Hold `$ORBIO` → earn / grant credits → **MCP manages keys** → **gateway spends** → daily structured brief → optional Telegram.

Built for [Orbio Build Week](https://orbio.so/build). Repo: `xiaoyang111222/orbio-research-desk`.

---

## Why this entry

Orbio’s pitch is not “another chat UI”. It is **agents that fund themselves**.

This desk does three things judges can verify in minutes:

1. **Self-funding loop (Orbio MCP)** — live `orbio_get_balance` / key status / claim / rotate against `https://www.orbio.so/api/mcp`
2. **Spend on the gateway** — briefs run with an Orbio key at `https://api.orbio.so/api/v1` (OpenAI-compatible)
3. **Ship a job** — daily research brief (Zod-structured) with Telegram delivery

It is deliberately small: readable TypeScript CLIs, no framework sprawl.

---

Full walkthrough: [DEMO.md](DEMO.md).

## 60-second demo

```bash
git clone https://github.com/xiaoyang111222/orbio-research-desk
cd orbio-research-desk
npm install --legacy-peer-deps
cp .env.example .env.local
# set OPENROUTER_API_KEY=sk-orbio-…   (from Orbio dashboard / MCP create_key)
# set OPENROUTER_BASE_URL=https://api.orbio.so/api/v1

npm run fund:status          # MCP balance + key (dry-run until ORBIO_MCP_TOKEN set)
npm run fund:probe           # MCP endpoint probe

# gather notes (gateway does not support OpenRouter server-side web_search)
export RESEARCH_NOTES_FILE=./out/research-notes.md
npm run brief -- "Robinhood Chain ORBIO"
```

Optional Telegram: set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — same `brief` command delivers there instead of stdout.

---

## Architecture

```
┌─────────────────┐     OAuth / MCP      ┌──────────────────┐
│  Orbio balance  │◄────────────────────►│  orbio-mcp.ts    │
│  + spend key    │   claim / rotate     │  fund:status CLI │
└────────┬────────┘                      └──────────────────┘
         │ sk-orbio-… @ api.orbio.so
         ▼
┌─────────────────┐   notes in → shape   ┌──────────────────┐
│  brief.ts       │─────────────────────►│  Zod DailyBrief  │
│  research desk  │                      │  → stdout / TG   │
└─────────────────┘                      └──────────────────┘
```

| Piece | Path | Role |
| --- | --- | --- |
| Gateway client | `src/lib/openrouter.ts` | OpenAI SDK → Orbio / OpenRouter base URL |
| MCP client | `src/lib/orbio-mcp.ts` | dry-run + live JSON-RPC tools/call |
| Telegram | `src/lib/telegram.ts` | optional delivery |
| Brief CLI | `src/cli/brief.ts` | notes → structured brief |
| Fund CLI | `src/cli/fund-status.ts` | `--claim` / `--rotate` / `--probe` |
| Daily wrapper | `src/cli/daily.ts` | fund snapshot + brief |

### Honest constraint

The **Orbio gateway rejects OpenRouter server-side tools** (`web_search`). Research notes are injected via `RESEARCH_NOTES` / `RESEARCH_NOTES_FILE` (operator, cron, or another agent), then the Orbio key does the expensive structured pass. That keeps spend on Orbio rails while staying compatible with the gateway.

---

## Self-funding (Orbio MCP)

Docs: https://orbio.so/mcp · Endpoint: `https://www.orbio.so/api/mcp`

Tools used: `orbio_get_balance`, `orbio_get_key_status`, `orbio_claim_key`, `orbio_create_key`, `orbio_revoke_key`.

```bash
npm run fund:status    # balance + key
npm run fund:claim     # claim key
npm run fund:rotate    # rotate / create key (retires previous)
npm run fund:probe     # unauthenticated probe (expects 401)
```

**Live mode:** complete MCP OAuth (scope `orbio:credits`), put the access token in `.env.local` as `ORBIO_MCP_TOKEN`, set `ORBIO_MCP_DRY_RUN=0`. Never commit tokens.

**Spend key for briefs** is still `OPENROUTER_API_KEY` (an `sk-orbio-…` key) pointed at `https://api.orbio.so/api/v1`.

During Build Week we ran this live: MCP showed ~$100.59 spendable on the apply wallet, key active, briefs billed through the gateway.

---

## Daily brief

```bash
mkdir -p out
# write sourced notes into out/research-notes.md
export RESEARCH_NOTES_FILE=./out/research-notes.md
npm run brief -- "Robinhood Chain tokenised equities ORBIO"
# or
npm run daily -- "Robinhood Chain tokenised equities ORBIO"
```

Output shape (Zod): `headline`, `summary`, `bullets`, `risks`, `sources[]`.

In this Build Week setup, a routine gathers public sources each morning (09:00 Asia/Shanghai), runs `brief`, and sends to Telegram when configured.

---

## Environment

See `.env.example`:

| Var | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Orbio spend key (`sk-orbio-…`) |
| `OPENROUTER_BASE_URL` | `https://api.orbio.so/api/v1` |
| `ORBIO_MCP_TOKEN` | MCP OAuth access token (live) |
| `ORBIO_MCP_DRY_RUN` | `1` default · `0` for live MCP |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | optional delivery |
| `RESEARCH_NOTES_FILE` | path to research notes for `brief` |

---

## Build Week checklist

- [x] Hold 1,000+ `$ORBIO` and apply (wallet + X)
- [x] Claim Build Week inference / Orbio key
- [x] Agent uses MCP + gateway (not a wrapped chatbot)
- [x] Daily brief job + Telegram path
- [ ] Repo public by day 7
- [ ] Judges can clone and run the 60-second demo above

---

## 中文摘要

Orbio Build Week 作品：**自充值加密研报台**。用 Orbio MCP 管余额/key，用 `api.orbio.so` 花额度出结构化日报，可推 Telegram。网关不支持服务端 `web_search`，所以素材外置、推理走 Orbio。小仓库、可复现、对准「agent 自己养自己」这条轨。

---

## Licence

MIT. Take anything.
