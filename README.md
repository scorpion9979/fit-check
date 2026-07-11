# Fit Check

A B2B resale sourcing app for **Fleek**, themed in a monochrome-plus-honey design system.

Built with **Bun** + **Next.js 16** (App Router, React 19). The flows are backed by **real
LLM agents** running through the **Vercel AI Gateway** (via the AI SDK), over a file-backed
JSON store of supplier lots.

## Three tabs

- **Demand** — post what you're sourcing (item description, quantity, price per item, grade).
  The description is parsed by an agent into a structured trait bid (hard filters + weighted
  soft traits); the explicit price/grade are applied as authoritative hard filters.
- **Matches** — swipe supplier lots (right / tap = add to basket). Each lot shows a photo
  gallery, a hard-filter breakdown (your demand vs the lot), matched soft-trait chips, and an
  **AI seller profile**. Scores, reasons, recommended actions and seller profiles are all
  produced by the match agent.
- **Basket** — review saved lots, totals (lots / units at MOQ / total), and request a Handpick call.

## Getting started

```bash
bun install

# Auth the AI Gateway — set ONE of these (see .env.example):
#   AI_GATEWAY_API_KEY=...           (static key, works anywhere)
#   or run `vercel env pull .env.local` on a linked project (VERCEL_OIDC_TOKEN)
cp .env.example .env.local   # then fill in the key

bun run dev                  # http://localhost:3000
```

Other scripts: `bun run build`, `bun run seed` (reset `data/store.json`), `bun run lint`.

Without a gateway key the app still runs — every agent falls back to a deterministic
rule-based path, so no route ever hard-fails.

## Architecture

- `src/app/page.tsx` → `FitCheckApp` (phone-shell client component) + the three views
  (`components/views/{DemandView,MatchesView,BasketView}.tsx`).
- `src/lib/agents/` — the AI-Gateway layer:
  - `gateway.ts` — `generateJSON` (structured output via `generateObject` + zod) and
    `generateProse`, with per-call model/tags/timeout/retry config and safe fallbacks.
  - `demandAgent.ts` — free-text demand → structured `Bid`.
  - `matchAgent.ts` — hard-filter gate → two small parallel calls: one scores + narrates
    the candidates, one writes an AI profile per unique supplier. Falls back to the
    deterministic matcher.
  - `sellAgent.ts`, `sellerAgent.ts` — spec extraction / seller-summary prose (used by the
    secondary API routes).
- `src/app/api/` — route handlers. Primary flow: `POST /api/demand/parse` → `GET /api/matches`
  (returns `MatchView[]` shaped for the Matches UI). Also `lots`, `bids`, `sell/extract`,
  `agent/seller-summary`, `shortlist`, `seed`.
- `src/lib/matching/`, `src/lib/schema/`, `src/lib/db/jsonStore.ts` — the deterministic
  matching engine, zod schemas, and file-backed store (seeded from `src/data/seed-*.json`,
  reset with `POST /api/seed`). These back the objective hard-filter gate and the fallbacks.
- `src/lib/fitcheck/matchView.ts` — maps a scored match into the exact card shape the
  Matches tab renders (gallery, breakdowns, supplier, AI profile).

The model defaults to `anthropic/claude-haiku-4.5` (fast + cheap for structured extraction);
override with `FIT_CHECK_MODEL`. A plain `provider/model` string routes through the AI Gateway
automatically.

## Theme

Monochrome-plus-honey tokens live in `src/app/globals.css` (`--honey`, `--ink`, `--pollen`,
`--mist`, `--warn-bg`, …). The original static design is preserved in `design-reference/`.
