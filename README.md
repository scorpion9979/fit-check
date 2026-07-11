# Fit Check

A B2B resale sourcing app for **Fleek**, themed in Bumble's honey-and-ink design system.

Built with **Bun** + **Next.js 16** (App Router, React 19). The four phone-shell flows are
wired to **real API routes** backed by a deterministic matching engine, demand parser, and a
file-backed JSON store (no LLM, no external services required to run).

## Flows

| Tab | What it does | Endpoints |
|-----|--------------|-----------|
| **Source** | Swipe-to-decide feed of supplier lots, auto-tagged from one photo. Each card shows how many open bids it matches. | `GET /api/lots` |
| **Search** | Freetext demand parsed into the trait schema (hard filters + weighted soft traits), then semantically matched against live lots. | `POST /api/demand/parse` → `GET /api/matches` |
| **Sell** | Photo → closed-enum spec sheet with per-field confidence. Listing clears the lot against the open bid book. | `POST /api/sell/extract` → `POST /api/lots` |
| **Bids** | A trait-bid order book with a live weighted-overlap-vs-threshold match meter and cleared counts. | `GET /api/bids`, `POST /api/bids` |

Built on a three-tier trait metadata standard: **hard filters** (category, size, condition, price)
/ **soft traits** (era, colours, fit, style, brand, material — weighted) / **provenance & ops**.

## Getting started

```bash
bun install
bun run dev        # http://localhost:3000
```

Other scripts:

```bash
bun run build      # production build
bun run seed       # reset data/store.json to fresh seed data
bun run lint
```

## Architecture

- `src/app/page.tsx` — renders `FitCheckApp`, the phone-shell client component.
- `src/components/` — `FitCheckApp` + the four views (`views/*`), shared `Glyphs`, `icons`.
- `src/app/api/` — route handlers. The matching/agent logic lives in `src/lib` and is called
  by the routes rather than re-derived in the UI.
- `src/lib/matching/` — `hardFilter` → weighted `softScore` (Jaccard) → `supplierMultiplier`
  → composite rank (`matcher.ts`).
- `src/lib/demand/parseDemand.ts` — rule-based freetext → `Bid`.
- `src/lib/fitcheck/` — presenters mapping domain objects into the phone-shell card shapes
  (`presenter.ts`), the mock-VLM spec extractor (`extract.ts`), and client-safe glyph helpers.
- `src/lib/db/jsonStore.ts` — file-backed store (`data/store.json`, gitignored, generated from
  `src/data/seed-*.json` on first run; reset with `POST /api/seed`).

The matching engine, schemas, and seed data are ported from the `fleek4hack` reference backend;
the UI is a Next.js port of the original self-contained design (kept in `design-reference/`).

## Theme

Honey-and-ink "bumble" tokens live in `src/app/globals.css` (`--honey`, `--ink`, `--pollen`,
`--mist`, …).
