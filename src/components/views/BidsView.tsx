"use client";

import { useCallbackRef } from "@/components/useCallbackRef";
import { useEffect, useState } from "react";
import type { BookEntry } from "@/lib/fitcheck/presenter";

interface Props {
  toast: (title: string, sub: string) => void;
  onBook: (count: number) => void;
}

const WEIGHTS = [
  { label: "era", w: 0.3 },
  { label: "colours", w: 0.25 },
  { label: "style tags", w: 0.25 },
  { label: "fit", w: 0.2 },
];

export default function BidsView({ toast, onBook }: Props) {
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState("Jackets");
  const [maxPrice, setMaxPrice] = useState("45");
  const [threshold, setThreshold] = useState("0.75");
  const [resting, setResting] = useState(false);

  const load = useCallbackRef(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bids");
      const data = await res.json();
      setEntries(data.entries ?? []);
      onBook((data.entries ?? []).filter((e: BookEntry) => e.status === "cleared").length);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    load();
  }, [load]);

  async function restBid() {
    if (resting) return;
    setResting(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          max_price_gbp: Number(maxPrice) || 45,
          match_threshold: Number(threshold) || 0.75,
        }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries((prev) => [data.entry as BookEntry, ...prev]);
        setComposerOpen(false);
        toast("Bid rested in the book", `Matching against ${entries.length ? "live lots" : "the feed"} now`);
      }
    } finally {
      setResting(false);
    }
  }

  return (
    <section className="view active">
      <div className="vhead">
        <h2>Trait bids</h2>
        <span className="sub">your order book</span>
      </div>

      <div className="rulecard">
        <div className="t">Matching rule</div>
        <p>
          Pass all <b style={{ color: "var(--honey)" }}>hard filters</b> at confidence{" "}
          <code>≥ 0.8</code>, then take weighted overlap on{" "}
          <b style={{ color: "var(--honey)" }}>soft traits</b>. Clears when{" "}
          <code>score ≥ threshold</code>.
        </p>
      </div>

      <button className="btn-ink newbid" onClick={() => setComposerOpen((o) => !o)}>
        + New trait bid
      </button>

      {composerOpen && (
        <div className="composer show">
          <div className="csub">Hard filters</div>
          <div className="two">
            <div className="field">
              <label>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="field">
              <label>Max price / unit (£)</label>
              <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>
          <div className="csub">Soft traits · weights sum to 1.0</div>
          {WEIGHTS.map((w) => (
            <div className="wrow" key={w.label}>
              <span className="wl">{w.label}</span>
              <span className="wtrack">
                <i style={{ width: `${w.w * 100}%` }} />
              </span>
              <span className="wv">{w.w.toFixed(2)}</span>
            </div>
          ))}
          <div className="field" style={{ marginTop: 10 }}>
            <label>Match threshold</label>
            <input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <button className="btn-ink" style={{ width: "100%" }} onClick={restBid} disabled={resting}>
            {resting ? "Resting…" : "Rest bid in the book"}
          </button>
        </div>
      )}

      {loading && <div className="loading-note">loading order book…</div>}

      {entries.map((b) => {
        const pct = Math.round(b.score * 100);
        const thr = Math.round(b.threshold * 100);
        return (
          <div className={`bid${b.status === "cleared" ? " cleared" : ""}`} key={b.bid_id}>
            <div className="top">
              <div className="price tnum">
                {b.price} <small>{b.unit}</small>
              </div>
              <span className={`st ${b.status}`}>{b.status}</span>
            </div>
            <div className="bidchips">
              {b.hard.map((h) => (
                <span className="k" key={h.key}>
                  {h.key} · {h.value}
                </span>
              ))}
              {b.soft.map((s) => (
                <span className="k soft" key={s.key}>
                  {s.key} · {s.value}
                  <span className="w">{s.weight}</span>
                </span>
              ))}
            </div>
            <div className="meter">
              <div className="ml">
                <span>
                  weighted overlap <b className="tnum">{b.score.toFixed(2)}</b> · {b.stat}
                </span>
                <span>threshold {b.threshold.toFixed(2)}</span>
              </div>
              <div className="track">
                <i style={{ width: `${pct}%` }} />
                <span className="th" style={{ left: `${thr}%` }} />
                <span className="thl" style={{ left: `${thr}%` }}>
                  {b.threshold.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
