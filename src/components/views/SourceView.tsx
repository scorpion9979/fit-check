"use client";

import { useCallbackRef } from "@/components/useCallbackRef";
import { useEffect, useRef, useState } from "react";
import type { DeckCard } from "@/lib/fitcheck/presenter";
import { IconClose, IconBidUp, IconCheck } from "@/components/icons";

type Act = "src" | "skip" | "bid";

interface Props {
  onSource: (card: DeckCard) => void;
  onBid: (card: DeckCard) => void;
}

export default function SourceView({ onSource, onBid }: Props) {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourced, setSourced] = useState(0);

  const load = useCallbackRef(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lots");
      const data = await res.json();
      setCards(data.cards ?? []);
      setIdx(0);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    load();
  }, [load]);

  const topRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const current = cards[idx];
  const done = !loading && idx >= cards.length;

  function fling(act: Act) {
    const node = topRef.current;
    const card = cards[idx];
    if (!node || !card) return;
    node.style.transition = "transform .42s cubic-bezier(.3,.7,.2,1), opacity .42s";
    if (act === "src") {
      node.style.transform = "translate(480px,-40px) rotate(22deg)";
      setSourced((s) => s + 1);
      onSource(card);
    } else if (act === "skip") {
      node.style.transform = "translate(-480px,-40px) rotate(-22deg)";
    } else {
      node.style.transform = "translate(0,-640px) rotate(-4deg)";
      onBid(card);
    }
    node.style.opacity = "0";
    window.setTimeout(() => setIdx((i) => i + 1), 240);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const rot = dx * 0.05;
    const node = e.currentTarget;
    node.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
    const up = dy < -60 && Math.abs(dy) > Math.abs(dx);
    setVerdict(node, "src", !up && dx > 30 ? Math.min(1, dx / 110) : 0);
    setVerdict(node, "skip", !up && dx < -30 ? Math.min(1, -dx / 110) : 0);
    setVerdict(node, "bid", up ? Math.min(1, -dy / 110) : 0);
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = null;
    if (dy < -90 && Math.abs(dy) > Math.abs(dx)) return fling("bid");
    if (dx > 95) return fling("src");
    if (dx < -95) return fling("skip");
    const node = e.currentTarget;
    node.style.transition = "transform .3s cubic-bezier(.2,.8,.2,1)";
    node.style.transform = "";
    ["src", "skip", "bid"].forEach((v) => setVerdict(node, v, 0));
  }

  function setVerdict(node: HTMLElement, kind: string, opacity: number) {
    const el = node.querySelector<HTMLElement>(`.verdict.${kind}`);
    if (el) el.style.opacity = String(opacity);
  }

  const visible = cards.slice(idx, idx + 3);

  return (
    <section className="view active">
      <div className="vhead">
        <h2>Source</h2>
        <span className="sub">{loading ? "loading…" : `${cards.length} live lots`}</span>
      </div>

      <div className="deck">
        {loading && <div className="loading-note">reading the drop…</div>}

        {done && (
          <div className="deck-empty show">
            <div className="big">That&apos;s the batch.</div>
            <p>
              You sourced <b>{sourced}</b> lots. New supplier drops land every few minutes.
            </p>
            <button className="btn-ink" onClick={() => load()}>
              Reload feed
            </button>
          </div>
        )}

        {visible.map((d, depth) => {
          const isTop = depth === 0;
          const gc =
            d.grade_variant === "out" ? "grade out" : d.grade_variant === "g" ? "grade g" : "grade";
          return (
            <div
              key={d.item_id}
              ref={isTop ? topRef : undefined}
              className="swipe"
              style={{
                transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.035})`,
                zIndex: 10 - depth,
                opacity: depth > 1 ? 0 : 1,
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
            >
              <div className="verdict src">SOURCE</div>
              <div className="verdict skip">SKIP</div>
              <div className="verdict bid">BID ↑</div>
              <div className="card">
                <div className="tile" style={{ background: d.tile }}>
                  <div className="tt">
                    <span className={gc}>Grade {d.grade}</span>
                    <span className="brandpill">
                      {d.brand}
                      <span className="c">{d.brand_confidence}</span>
                    </span>
                  </div>
                  <svg className="g" viewBox="0 0 100 120" style={{ color: "#3b3b3b" }}>
                    <use href={`#${d.glyph}`} />
                  </svg>
                  {d.matches > 0 && (
                    <span className="matchbid">
                      <span className="d" />
                      matches {d.matches} open bid{d.matches > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="meta">
                  <h3>{d.title}</h3>
                  <div className="traitgroup">
                    <span className="lab">Hard filters</span>
                    <div className="chips">
                      <span className="chip">{d.category}</span>
                      <span className="chip">size {d.size}</span>
                      <span className="chip">{d.gender}</span>
                    </div>
                  </div>
                  <div className="traitgroup">
                    <span className="lab">Soft traits</span>
                    <div className="chips">
                      {d.soft.map((s) => (
                        <span className="chip soft" key={s.key}>
                          {s.key} · {s.value}
                          {s.note && <span className="c">{s.note}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="specline">
                    <span>{d.measurements}</span>
                  </div>
                  <div className="econ">
                    <div>
                      <div className="lbl">Cost/unit</div>
                      <div className="val tnum">{d.cost}</div>
                    </div>
                    <div>
                      <div className="lbl">Est. resale</div>
                      <div className="val tnum">{d.resale}</div>
                    </div>
                    <div>
                      <div className="lbl">Margin</div>
                      <div className="val tnum">{d.margin}</div>
                    </div>
                  </div>
                  <div className="impact">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22c5-2 8-6 8-12V5l-8-3-8 3v5c0 6 3 10 8 12z" />
                    </svg>
                    {d.impact}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!done && !loading && (
        <>
          <div className="controls">
            <button className="cbtn skip" title="Skip" onClick={() => fling("skip")} disabled={!current}>
              <IconClose />
            </button>
            <button className="cbtn bid" title="Trait bid" onClick={() => fling("bid")} disabled={!current}>
              <IconBidUp />
            </button>
            <button className="cbtn src" title="Source" onClick={() => fling("src")} disabled={!current}>
              <IconCheck />
            </button>
          </div>
          <div className="hint">Typed from one photo · hard filters + soft traits</div>
        </>
      )}
    </section>
  );
}
