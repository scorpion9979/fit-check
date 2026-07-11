"use client";

import { useState } from "react";
import type { Bid } from "@/lib/schema/bid";
import type { MatchCard } from "@/lib/schema/match";
import { categoryLeaf, glyphFor } from "@/lib/fitcheck/glyph";
import { IconSearch, IconSpark } from "@/components/icons";

const DEMO_QUERY = "boxy 90s gorpcore jacket, forest green, size L, under £45";

const SOFT_LABELS: Record<string, string> = {
  era: "era",
  colors: "colors",
  fit: "fit",
  style_tags: "style",
  brand: "brand",
  material: "material",
};

export default function SearchView() {
  const [query, setQuery] = useState(DEMO_QUERY);
  const [bid, setBid] = useState<Bid | null>(null);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function run() {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const parseRes = await fetch("/api/demand/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const parsed = await parseRes.json();
      if (!parsed.bid) return;
      setBid(parsed.bid);

      const matchRes = await fetch(`/api/matches?bidId=${encodeURIComponent(parsed.bid.bid_id)}`);
      const matched = await matchRes.json();
      setCards(matched.cards ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const softEntries = bid
    ? Object.entries(bid.soft).filter(([, v]) => v) as [string, { want: string[]; w: number }][]
    : [];

  return (
    <section className="view active">
      <div className="vhead">
        <h2>Search</h2>
        <span className="sub">vibe or filter</span>
      </div>

      <div className="searchbar">
        <IconSearch />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Describe what you're sourcing…"
        />
        <button className="go" onClick={run} disabled={loading}>
          {loading ? "…" : "Match"}
        </button>
      </div>

      {bid && (
        <div className="parsed show">
          <div className="h">
            <IconSpark width={14} height={14} />
            parsed into the schema
          </div>
          <div className="tier">
            <div className="tl">Tier 1 · hard filters</div>
            <div className="kvs">
              <span className="kv">
                category <b>{categoryLeaf(bid.hard.category)}</b>
              </span>
              <span className="kv">
                size <b>{bid.hard.size_label.join(" / ")}</b>
              </span>
              <span className="kv">
                grade <b>≥ {bid.hard.condition_min}</b>
              </span>
              <span className="kv">
                max_price <b>£{bid.hard.max_price_gbp}</b>
              </span>
            </div>
          </div>
          <div className="tier">
            <div className="tl">Tier 2 · soft traits (weighted)</div>
            <div className="kvs">
              {softEntries.map(([key, v]) => (
                <span className="kv soft" key={key}>
                  {SOFT_LABELS[key] ?? key}{" "}
                  <b>{v.want.map((w) => w.replace(/_/g, " ")).join(", ")}</b>
                  <span className="w">·{Math.round(v.w * 100)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="results">
        {searched && cards.length === 0 && (
          <div className="empty-note">No live lots cleared this demand. Loosen a soft trait.</div>
        )}
        {cards.map((c) => (
          <div className="rcard" key={c.match_id}>
            <div className="rtile" style={{ background: "#fff386" }}>
              <span className="match">{c.match_score}%</span>
              <svg viewBox="0 0 100 120" style={{ color: "#3b3b3b" }}>
                <use href={`#${glyphFor(c.item.category)}`} />
              </svg>
            </div>
            <div className="rmeta">
              <div className="rn">{c.item.title}</div>
              <div className="rp">
                <span>grade {c.item.condition.grade}</span>
                <b>£{c.item.price_gbp}/unit</b>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
