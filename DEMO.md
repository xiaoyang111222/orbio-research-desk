# Demo — Orbio Research Desk

For Orbio Build Week judges. Aim: **clone → run → see the self-funding loop** in under two minutes.

## What you will see

1. **MCP fund status** — balance / key on Orbio rails (`fund:status`)
2. **One structured brief** — Orbio gateway spend key shapes research notes (`brief`)
3. **Optional Telegram** — same brief delivered if env is set

A saved sample output (no secrets) is in [`examples/sample-brief-2026-09-12.txt`](examples/sample-brief-2026-09-12.txt).

---

## Prerequisites

- Node 20+ (22 preferred)
- An Orbio spend key (`sk-orbio-…`) from [orbio.so](https://orbio.so) dashboard or MCP `create_key`
- Optional: Orbio MCP OAuth token for live `fund:*` (otherwise dry-run fixtures)

---

## Steps

### 1. Install

```bash
git clone https://github.com/xiaoyang111222/orbio-research-desk
cd orbio-research-desk
npm install --legacy-peer-deps
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENROUTER_API_KEY=sk-orbio-…
OPENROUTER_BASE_URL=https://api.orbio.so/api/v1
# optional live MCP:
# ORBIO_MCP_TOKEN=…
# ORBIO_MCP_DRY_RUN=0
```

### 2. Self-funding check

```bash
npm run fund:probe     # expects 401 without token
npm run fund:status    # dry-run fixtures, or live balance if MCP token set
```

Live mode proves the agent can read accrued credits and key status through Orbio MCP — the Build Week “claim the way your agent will” path.

### 3. Run a brief (gateway-compatible)

The Orbio gateway does **not** support OpenRouter server-side `web_search`. Feed notes, then spend on Orbio:

```bash
mkdir -p out
cat > out/research-notes.md << 'NOTES'
# paste a few sourced bullets + https:// URLs
NOTES

export RESEARCH_NOTES_FILE=./out/research-notes.md
npm run brief -- "Robinhood Chain ORBIO"
```

You should get a Zod-shaped desk brief on stdout (or Telegram if configured).

### 4. Claim / rotate (optional)

```bash
npm run fund:claim     # orbio_claim_key
npm run fund:rotate    # orbio_create_key — retires previous secret
```

Use carefully on a live key.

---

## Script cheat sheet

| Command | What it does |
| --- | --- |
| `npm run fund:status` | MCP balance + key |
| `npm run fund:claim` | Claim key |
| `npm run fund:rotate` | Rotate key |
| `npm run fund:probe` | Unauthenticated MCP probe |
| `npm run brief -- "topic"` | Shape notes → brief |
| `npm run daily -- "topic"` | Fund snapshot + brief |
| `npm run typecheck` | `tsc --noEmit` |

---

## Recording tip (30–60s)

1. Show `fund:status` live (or dry-run)  
2. Run `brief` with `RESEARCH_NOTES_FILE`  
3. Flash the headline + bullets  
4. Point at README “Why this entry” — **MCP + gateway + job**, not a chat wrapper  

---

## 中文

评委路径：装依赖 → `fund:status` 看自充值 → 用笔记文件跑 `brief` → 看结构化日报。样例见 `examples/`。网关不支持服务端搜索，素材外置、推理走 Orbio。
