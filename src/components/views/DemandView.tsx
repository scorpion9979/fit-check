"use client";

import { useState } from "react";

interface Props {
  onPosted: (bidId: string) => void;
}

const GRADES = ["A", "AB", "B"] as const;
// The bid schema's condition grades are A/B/C/D; map the demand chip to a min grade.
const GRADE_TO_MIN: Record<string, string> = { A: "A", AB: "B", B: "B" };

export default function DemandView({ onPosted }: Props) {
  const [desc, setDesc] = useState(
    "90s / Y2K gorpcore jackets, boxy fit, earth tones, L–XL, grade B or better",
  );
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState("45");
  const [grade, setGrade] = useState<string>("B");
  const [infoOpen, setInfoOpen] = useState(true);
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!desc.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/demand/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: desc,
          quantity: Number(qty) || undefined,
          price_gbp: Number(price) || undefined,
          grade: GRADE_TO_MIN[grade] ?? "B",
        }),
      });
      const data = await res.json();
      if (data.bid?.bid_id) onPosted(data.bid.bid_id);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="view active">
      <div className="vhead">
        <h2>Post a demand</h2>
        <div className="s">Tell us what you&apos;re sourcing.</div>
      </div>

      <div className="field">
        <label>
          Item description <span className="req">*</span>
        </label>
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. 90s gorpcore jackets, boxy fit, earth tones, L–XL"
        />
      </div>

      <div className="two" style={{ marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>
            Quantity <span className="req">*</span>
          </label>
          <div className="inpwrap">
            <input
              className="inp"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              style={{ paddingRight: 44 }}
            />
            <span className="suffix">pcs</span>
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>
            Price per item <span className="req">*</span>
          </label>
          <div className="inpwrap">
            <span className="prefix">£</span>
            <input
              className="inp"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              style={{ paddingLeft: 26 }}
            />
          </div>
        </div>
      </div>

      {infoOpen && (
        <div className="infobanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" strokeLinecap="round" />
            <circle cx="12" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
          </svg>
          <span>All these prices are exclusive of shipping</span>
          <button className="x" aria-label="Dismiss" onClick={() => setInfoOpen(false)}>
            ✕
          </button>
        </div>
      )}

      <div className="field">
        <label>Grade</label>
        <div className="grades">
          {GRADES.map((g) => (
            <button
              key={g}
              className={`grade-opt${grade === g ? " on" : ""}`}
              onClick={() => setGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-ink"
        style={{ width: "100%", marginTop: 22, padding: 16, fontSize: 16 }}
        onClick={post}
        disabled={posting}
      >
        {posting ? "Posting…" : "Post demand"}
      </button>
    </section>
  );
}
