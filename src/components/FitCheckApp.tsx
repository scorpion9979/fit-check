"use client";

import { useCallback, useRef, useState } from "react";
import Glyphs from "@/components/Glyphs";
import SourceView from "@/components/views/SourceView";
import SearchView from "@/components/views/SearchView";
import SellView from "@/components/views/SellView";
import BidsView from "@/components/views/BidsView";
import type { DeckCard } from "@/lib/fitcheck/presenter";
import { IconCheck, IconTabSource, IconSearch, IconTabSell, IconTabBids } from "@/components/icons";

type Tab = "source" | "search" | "sell" | "bids";

function money(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}
function qtyOf(s: string): number {
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : 1;
}

export default function FitCheckApp() {
  const [tab, setTab] = useState<Tab>("source");
  const [basketCount, setBasketCount] = useState(0);
  const [basketValue, setBasketValue] = useState(0);
  const [clearedBids, setClearedBids] = useState(0);

  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((title: string, sub: string) => {
    setToast({ title, sub });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2700);
  }, []);

  const handleSource = useCallback(
    (card: DeckCard) => {
      setBasketCount((c) => c + 1);
      setBasketValue((v) => v + money(card.cost) * qtyOf(card.qty));
      showToast(`Sourced · ${card.title}`, `${card.qty} · ${card.cost}/unit added to basket`);
    },
    [showToast],
  );

  const handleBid = useCallback(
    (card: DeckCard) => {
      showToast("Trait bid drafted", `Standing offer typed from ${card.title.toLowerCase()}`);
    },
    [showToast],
  );

  return (
    <div className="phone">
      <div className="notch" />
      <div className="screen">
        <div className="topbar">
          <div className="mark">Fit Check</div>
          <div className="basket">
            Basket <b>{basketCount}</b> · <span>£{Math.round(basketValue)}</span>
          </div>
        </div>

        <div className="body">
          {tab === "source" && <SourceView onSource={handleSource} onBid={handleBid} />}
          {tab === "search" && <SearchView />}
          {tab === "sell" && <SellView toast={showToast} onListed={() => setTab("bids")} />}
          {tab === "bids" && <BidsView toast={showToast} onBook={setClearedBids} />}
        </div>

        <div className={`toast${toast ? " show" : ""}`}>
          <div className="tic">
            <IconCheck width={18} height={18} />
          </div>
          <div>
            <div className="tt">{toast?.title}</div>
            <div className="ts">{toast?.sub}</div>
          </div>
        </div>

        <nav className="bnav">
          <button className={`tab${tab === "source" ? " active" : ""}`} onClick={() => setTab("source")}>
            <span className="ico">
              <IconTabSource />
            </span>
            Source
            {basketCount > 0 && <span className="badge">{basketCount}</span>}
          </button>
          <button className={`tab${tab === "search" ? " active" : ""}`} onClick={() => setTab("search")}>
            <span className="ico">
              <IconSearch />
            </span>
            Search
          </button>
          <button className={`tab${tab === "sell" ? " active" : ""}`} onClick={() => setTab("sell")}>
            <span className="ico">
              <IconTabSell />
            </span>
            Sell
          </button>
          <button className={`tab${tab === "bids" ? " active" : ""}`} onClick={() => setTab("bids")}>
            <span className="ico">
              <IconTabBids />
            </span>
            Bids
            {clearedBids > 0 && <span className="badge">{clearedBids}</span>}
          </button>
        </nav>
      </div>
      <Glyphs />
    </div>
  );
}
