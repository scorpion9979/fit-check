"use client";

import { useCallback, useRef, useState } from "react";
import DemandView from "@/components/views/DemandView";
import MatchesView from "@/components/views/MatchesView";
import BasketView from "@/components/views/BasketView";
import type { MatchView } from "@/lib/fitcheck/matchView";

type Tab = "demand" | "matches" | "basket";

export default function FitCheckApp() {
  const [tab, setTab] = useState<Tab>("demand");
  const [bidId, setBidId] = useState<string | null>(null);
  const [basket, setBasket] = useState<MatchView[]>([]);

  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((title: string, sub = "") => {
    setToast({ title, sub });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const handlePosted = useCallback(
    (id: string) => {
      setBidId(id);
      setTab("matches");
      showToast("Demand posted", "Matching against live supplier stock");
    },
    [showToast],
  );

  const addToBasket = useCallback(
    (m: MatchView) => {
      setBasket((prev) => (prev.some((b) => b.id === m.id) ? prev : [...prev, m]));
      showToast("Added to basket", m.title);
    },
    [showToast],
  );

  const removeFromBasket = useCallback((id: string) => {
    setBasket((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const basketValue = basket.reduce((a, b) => a + b.lotVal, 0);

  return (
    <div className="phone">
      <div className="notch" />
      <div className="screen">
        <div className="topbar">
          <div className="mark">Fit Check</div>
          <div className="basket">
            Basket <b>{basket.length}</b> · <span>£{basketValue}</span>
          </div>
        </div>

        <div className="body">
          {tab === "demand" && <DemandView onPosted={handlePosted} />}
          {tab === "matches" && (
            <MatchesView
              bidId={bidId}
              basketIds={basket.map((b) => b.id)}
              onAdd={addToBasket}
              onReviewBasket={() => setTab("basket")}
            />
          )}
          {tab === "basket" && (
            <BasketView basket={basket} onRemove={removeFromBasket} toast={showToast} />
          )}
        </div>

        <div className={`toast${toast ? " show" : ""}`}>
          <div className="tic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <div className="tt">{toast?.title}</div>
            <div className="ts">{toast?.sub}</div>
          </div>
        </div>

        <nav className="bnav">
          <button className={`tab${tab === "demand" ? " active" : ""}`} onClick={() => setTab("demand")}>
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h10M4 18h6" />
                <circle cx="18" cy="16" r="3" />
                <path d="M20.5 18.5L22 20" />
              </svg>
            </span>
            Demand
          </button>
          <button className={`tab${tab === "matches" ? " active" : ""}`} onClick={() => setTab("matches")}>
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="18" rx="3" />
                <path d="M4 15l4-3 4 3 4-4 4 3" strokeLinecap="round" />
              </svg>
            </span>
            Matches
          </button>
          <button className={`tab${tab === "basket" ? " active" : ""}`} onClick={() => setTab("basket")}>
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </span>
            Basket
            {basket.length > 0 && <span className="badge">{basket.length}</span>}
          </button>
        </nav>
      </div>
    </div>
  );
}
