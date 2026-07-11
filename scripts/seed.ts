/**
 * Reset the file-backed JSON store to fresh seed data.
 * Run with: bun run seed
 */
import { resetStore } from "../src/lib/db/jsonStore";

const store = resetStore();
console.log(
  `Seeded store.json → ${store.suppliers.length} suppliers, ${store.items.length} items, ${store.bids.length} bids, ${store.salesHistory.length} sales records.`,
);
