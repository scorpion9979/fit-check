# Fit Check

A B2B resale sourcing app concept for **Fleek**, themed in Bumble's honey-and-ink design system.

Single self-contained HTML file (`fit-check.html`, also served as `index.html`). No build, no dependencies — open it in a browser.

Four flows in one phone shell:
- **Source** — swipe-to-decide feed of supplier lots, auto-tagged from one photo (hard filters + weighted soft traits).
- **Search** — freetext parsed into the trait schema + semantic match.
- **Sell** — photo → closed-enum spec sheet with per-field confidence, ready to list.
- **Bids** — a trait-bid order book with a live weighted-overlap-vs-threshold match meter.

Built on a three-tier trait metadata standard (hard filters / soft traits / provenance).
