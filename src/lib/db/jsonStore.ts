import fs from "fs";
import path from "path";
import { Bid, BidSchema } from "../schema/bid";
import { ItemMetadata, ItemMetadataSchema } from "../schema/item";
import { SupplierProfile, SupplierProfileSchema } from "../schema/supplier";
import { SaleRecord, SaleRecordSchema } from "../schema/sellerSummary";
import seedSuppliers from "@/data/seed-suppliers.json";
import seedItems from "@/data/seed-items.json";
import seedBids from "@/data/seed-bids.json";
import seedSalesHistory from "@/data/seed-sales-history.json";

export interface ShortlistEntry {
  match_id: string;
  bid_id: string;
  saved_at: string;
  card_snapshot?: unknown;
}

export interface JsonStoreData {
  suppliers: SupplierProfile[];
  items: ItemMetadata[];
  bids: Bid[];
  salesHistory: SaleRecord[];
  shortlist: ShortlistEntry[];
  seeded: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function defaultStore(): JsonStoreData {
  return {
    suppliers: seedSuppliers as SupplierProfile[],
    items: seedItems as ItemMetadata[],
    bids: seedBids as Bid[],
    salesHistory: seedSalesHistory as SaleRecord[],
    shortlist: [],
    seeded: true,
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): JsonStoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const store = defaultStore();
    writeStore(store);
    return store;
  }
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as JsonStoreData;
  return {
    ...defaultStore(),
    ...parsed,
    suppliers: parsed.suppliers?.length ? parsed.suppliers : (seedSuppliers as SupplierProfile[]),
    items: parsed.items?.length ? parsed.items : (seedItems as ItemMetadata[]),
    bids: parsed.bids?.length ? parsed.bids : (seedBids as Bid[]),
    salesHistory: parsed.salesHistory?.length
      ? parsed.salesHistory
      : (seedSalesHistory as SaleRecord[]),
    shortlist: parsed.shortlist ?? [],
  };
}

function writeStore(data: JsonStoreData) {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getStore(): JsonStoreData {
  return readStore();
}

export function resetStore(): JsonStoreData {
  const store = defaultStore();
  writeStore(store);
  return store;
}

export function getSuppliers(): SupplierProfile[] {
  return getStore().suppliers.map((s) => SupplierProfileSchema.parse(s));
}

export function getItems(): ItemMetadata[] {
  return getStore().items.map((i) => ItemMetadataSchema.parse(i));
}

export function getBids(): Bid[] {
  return getStore().bids.map((b) => BidSchema.parse(b));
}

export function getSalesHistory(sellerId?: string): SaleRecord[] {
  const all = getStore().salesHistory.map((s) => SaleRecordSchema.parse(s));
  return sellerId ? all.filter((s) => s.seller_id === sellerId) : all;
}

export function getBid(bidId: string): Bid | undefined {
  return getBids().find((b) => b.bid_id === bidId);
}

export function saveBid(bid: Bid): Bid {
  const store = readStore();
  const parsed = BidSchema.parse(bid);
  const idx = store.bids.findIndex((b) => b.bid_id === parsed.bid_id);
  if (idx >= 0) store.bids[idx] = parsed;
  else store.bids.push(parsed);
  writeStore(store);
  return parsed;
}

export function saveItem(item: ItemMetadata): ItemMetadata {
  const store = readStore();
  const parsed = ItemMetadataSchema.parse(item);
  store.items.push(parsed);
  writeStore(store);
  return parsed;
}

export function getShortlist(bidId?: string): ShortlistEntry[] {
  const list = readStore().shortlist;
  return bidId ? list.filter((s) => s.bid_id === bidId) : list;
}

export function addToShortlist(entry: ShortlistEntry): ShortlistEntry[] {
  const store = readStore();
  if (!store.shortlist.some((s) => s.match_id === entry.match_id)) {
    store.shortlist.push(entry);
    writeStore(store);
  }
  return store.shortlist;
}

export function removeFromShortlist(matchId: string): ShortlistEntry[] {
  const store = readStore();
  store.shortlist = store.shortlist.filter((s) => s.match_id !== matchId);
  writeStore(store);
  return store.shortlist;
}
