"use client";

import { useRef, useState } from "react";
import type { ExtractDraft } from "@/lib/fitcheck/extract";
import {
  COLORS,
  CONDITION_GRADES,
  DEMO_CATEGORIES,
  ERAS,
  FITS,
  GENDERS,
  PATTERNS,
  SIZE_LABELS,
  SIZE_SYSTEMS,
} from "@/lib/schema/enums";
import { IconUpload, IconCheck } from "@/components/icons";

const SCAN_STEPS = [
  "reading the garment…",
  "matching to closed vocab…",
  "estimating grade & era…",
  "flagging defects…",
];

type Phase = "idle" | "scanning" | "form";

interface Props {
  toast: (title: string, sub: string) => void;
  onListed: () => void;
}

function Conf({ value }: { value?: number }) {
  if (value == null) return <span className="conf">label</span>;
  return (
    <span className="conf">
      <span className="confbar">
        <i style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      {value.toFixed(2)}
    </span>
  );
}

export default function SellView({ toast, onListed }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanText, setScanText] = useState(SCAN_STEPS[0]);
  const [draft, setDraft] = useState<ExtractDraft | null>(null);
  const [listing, setListing] = useState(false);
  const seed = useRef(0);

  function update<K extends keyof ExtractDraft>(key: K, value: ExtractDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function startScan() {
    setPhase("scanning");
    setScanText(SCAN_STEPS[0]);
    let step = 0;
    const iv = window.setInterval(() => {
      step++;
      if (step < SCAN_STEPS.length) setScanText(SCAN_STEPS[step]);
    }, 520);

    seed.current += 1;
    const fetchP = fetch("/api/sell/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: seed.current }),
    }).then((r) => r.json());

    const minDelay = new Promise((res) => window.setTimeout(res, 2200));
    const [data] = await Promise.all([fetchP, minDelay]);
    window.clearInterval(iv);
    setDraft(data.draft as ExtractDraft);
    setPhase("form");
  }

  async function list() {
    if (!draft || listing) return;
    setListing(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.error) {
        toast("Could not list", data.error);
        return;
      }
      const n = data.cleared ?? 0;
      toast(
        "Listed to Fleek",
        n > 0
          ? `${n} open trait bid${n > 1 ? "s" : ""} match. Buyers notified.`
          : "No open bids cleared yet — resting in the feed.",
      );
      onListed();
      setPhase("idle");
      setDraft(null);
    } finally {
      setListing(false);
    }
  }

  const toggleDefect = (i: number) => {
    setDraft((d) => {
      if (!d) return d;
      const defects = [...d.defects];
      // toggling just re-lists it; for demo we drop it when "confirmed off"
      defects.splice(i, 1);
      return { ...d, defects };
    });
  };

  return (
    <section className="view active">
      <div className="vhead">
        <h2>List a lot</h2>
        <span className="sub">photo → spec</span>
      </div>

      {phase === "idle" && (
        <div className="drop" onClick={startScan}>
          <div className="ic">
            <IconUpload />
          </div>
          <h3>Add a photo of your item</h3>
          <p>
            Our vision model reads it against a closed vocabulary — brand, era, grade, defects. You
            confirm.
          </p>
          <div className="m">tap to simulate an upload</div>
        </div>
      )}

      {phase === "scanning" && (
        <div className="scanning show">
          <div className="scanshot">
            <div className="scanline" />
            <svg viewBox="0 0 100 120">
              <use href="#g-jacket" />
            </svg>
          </div>
          <div className="m">{scanText}</div>
        </div>
      )}

      {phase === "form" && draft && (
        <div className="form show">
          <div className="banner">
            <IconCheck width={16} height={16} />
            Typed to schema. Every value is a closed enum — fix any the model missed.
          </div>

          <div className="tierhead">
            <span className="n">1</span> Hard filters
          </div>
          <div className="field">
            <label>
              Category path <Conf value={draft.confidence.category} />
            </label>
            <select value={draft.category} onChange={(e) => update("category", e.target.value)}>
              {DEMO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/ > /g, " › ")}
                </option>
              ))}
            </select>
          </div>
          <div className="two">
            <div className="field">
              <label>Size</label>
              <select
                value={draft.size.label}
                onChange={(e) => update("size", { ...draft.size, label: e.target.value as never })}
              >
                {SIZE_LABELS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Size system</label>
              <select
                value={draft.size.system}
                onChange={(e) => update("size", { ...draft.size, system: e.target.value as never })}
              >
                {SIZE_SYSTEMS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label>Gender</label>
              <select value={draft.gender} onChange={(e) => update("gender", e.target.value as never)}>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>
                Grade <Conf value={draft.confidence.condition} />
              </label>
              <select
                value={draft.condition.grade}
                onChange={(e) =>
                  update("condition", { ...draft.condition, grade: e.target.value as never })
                }
              >
                {CONDITION_GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tierhead">
            <span className="n">2</span> Soft traits
          </div>
          <div className="two">
            <div className="field">
              <label>
                Brand <Conf value={draft.confidence.brand ?? draft.brand.confidence} />
              </label>
              <input
                value={draft.brand.name}
                onChange={(e) => update("brand", { ...draft.brand, name: e.target.value })}
              />
              <div className="enumhint">
                <span className="dot" /> source · {draft.brand.source.replace(/_/g, " ")}
              </div>
            </div>
            <div className="field">
              <label>
                Era <Conf value={draft.confidence.era} />
              </label>
              <select value={draft.era} onChange={(e) => update("era", e.target.value as never)}>
                {ERAS.map((er) => (
                  <option key={er}>{er}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label>Primary colour</label>
              <select
                value={draft.colors.primary}
                onChange={(e) => update("colors", { ...draft.colors, primary: e.target.value as never })}
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fit</label>
              <select value={draft.fit} onChange={(e) => update("fit", e.target.value as never)}>
                {FITS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Pattern</label>
            <select value={draft.pattern} onChange={(e) => update("pattern", e.target.value as never)}>
              {PATTERNS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Style tags</label>
            <div className="chips">
              {draft.style_tags.map((t) => (
                <span className="chip" key={t}>
                  {t.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          <div className="tierhead">
            <span className="n">3</span> Provenance &amp; ops
          </div>
          <div className="two">
            <div className="field">
              <label>Pit-to-pit (cm)</label>
              <input
                value={draft.measurements_cm.pit_to_pit ?? ""}
                onChange={(e) =>
                  update("measurements_cm", {
                    ...draft.measurements_cm,
                    pit_to_pit: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
            <div className="field">
              <label>Length (cm)</label>
              <input
                value={draft.measurements_cm.length ?? ""}
                onChange={(e) =>
                  update("measurements_cm", {
                    ...draft.measurements_cm,
                    length: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>
              Defects <span className="conf">tap to confirm</span>
            </label>
            <div className="defects">
              {draft.defects.length === 0 && <span className="chip">none flagged</span>}
              {draft.defects.map((d, i) => (
                <span className="chip on" key={`${d.type}-${i}`} onClick={() => toggleDefect(i)}>
                  {d.type.replace(/_/g, " ")} · {d.location} · {d.severity}
                </span>
              ))}
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label>Ask / unit (£)</label>
              <input
                value={draft.price_gbp}
                onChange={(e) => update("price_gbp", Number(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label>Listing type</label>
              <select
                value={draft.listing_type}
                onChange={(e) => update("listing_type", e.target.value as never)}
              >
                <option value="single">single</option>
                <option value="bundle">bundle</option>
              </select>
            </div>
          </div>
          <button className="btn-ink listbtn" onClick={list} disabled={listing}>
            {listing ? "Clearing…" : "List to Fleek · clear against open bids"}
          </button>
        </div>
      )}
    </section>
  );
}
