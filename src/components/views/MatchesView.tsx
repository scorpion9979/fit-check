"use client";

import { useEffect, useRef, useState } from "react";
import { useCallbackRef } from "@/components/useCallbackRef";
import type { MatchView } from "@/lib/fitcheck/matchView";

interface Props {
  bidId: string | null;
  basketIds: string[];
  onAdd: (m: MatchView) => void;
  onReviewBasket: () => void;
}

function stars(r: number): string {
  const n = Math.round(r);
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

export default function MatchesView({ bidId, onAdd, onReviewBasket }: Props) {
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [idx, setIdx] = useState(0);
  const [gcur, setGcur] = useState(0);
  const [loading, setLoading] = useState(false);

  const topRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const load = useCallbackRef(async () => {
    if (!bidId) {
      setMatches([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?bidId=${encodeURIComponent(bidId)}`);
      const data = await res.json();
      setMatches(data.matches ?? []);
      setIdx(0);
      setGcur(0);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    load();
  }, [bidId, load]);

  const current = matches[idx];
  const done = !loading && bidId && idx >= matches.length && matches.length > 0;

  function setVerdict(node: HTMLElement, kind: string, opacity: number) {
    const el = node.querySelector<HTMLElement>(`.verdict.${kind}`);
    if (el) el.style.opacity = String(opacity);
  }

  function decide(act: "add" | "pass") {
    const node = topRef.current;
    if (!node || !current) return;
    node.style.transition = "transform .42s cubic-bezier(.3,.7,.2,1), opacity .42s";
    node.style.transform =
      act === "add" ? "translateX(480px) rotate(20deg)" : "translateX(-480px) rotate(-20deg)";
    node.style.opacity = "0";
    if (act === "add") onAdd(current);
    window.setTimeout(() => {
      setIdx((i) => i + 1);
      setGcur(0);
    }, 240);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    e.currentTarget.style.transition = "none";
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) < Math.abs(dy) && Math.abs(dx) < 12) return; // let vertical scroll pass
    const node = e.currentTarget;
    node.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    setVerdict(node, "add", dx > 20 ? Math.min(1, dx / 90) : 0);
    setVerdict(node, "pass", dx < -20 ? Math.min(1, -dx / 90) : 0);
  }
  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current = null;
    if (dx > 100) return decide("add");
    if (dx < -100) return decide("pass");
    const node = e.currentTarget;
    node.style.transition = "transform .3s ease";
    node.style.transform = "";
    setVerdict(node, "add", 0);
    setVerdict(node, "pass", 0);
  }

  const gallery = current?.gallery ?? [];

  return (
    <section className="view flexcol active">
      <div className="prog">
        <span className="pt">
          {matches.length ? `${Math.min(idx, matches.length - 1) + 1} of ${matches.length}` : "0 of 0"}
        </span>
        <span className="dots">
          {matches.map((_, i) => (
            <i key={i} className={i === idx ? "on" : ""} />
          ))}
        </span>
      </div>

      <div className="deck">
        {loading && (
          <div className="deck-loading">
            <div className="spin" />
            <div className="m">the agent is scoring lots…</div>
          </div>
        )}

        {!loading && !bidId && (
          <div className="deck-empty show">
            <div className="big">No demand yet</div>
            <p>Post a demand and the agent will match it against live supplier stock.</p>
          </div>
        )}

        {done && (
          <div className="deck-empty show">
            <div className="big">That&apos;s every match.</div>
            <p>Review the lots you added under Basket.</p>
            <button className="btn-ink" onClick={onReviewBasket}>
              Review basket
            </button>
          </div>
        )}

        {!loading && current && (
          <div
            key={current.id}
            className="swipe"
            ref={(el) => {
              topRef.current = el;
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <div className="tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pimg" alt={current.title} src={gallery[gcur] ?? gallery[0] ?? ""} />
              <span className="grade">Grade {current.grade}</span>
              <span className="match">{current.match}% match</span>
              {gallery.length > 1 && (
                <>
                  <button
                    className="gnav prev"
                    aria-label="Previous image"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGcur((c) => (c - 1 + gallery.length) % gallery.length);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    className="gnav next"
                    aria-label="Next image"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGcur((c) => (c + 1) % gallery.length);
                    }}
                  >
                    ›
                  </button>
                </>
              )}
              <div className="gdots">
                {gallery.map((_, k) => (
                  <i key={k} className={k === gcur ? "on" : ""} />
                ))}
              </div>
              <div className="verdict add">ADD</div>
              <div className="verdict pass">PASS</div>
            </div>

            <div className="mtitle">{current.title}</div>
            <div className="mprice">
              {current.price} · {current.lot}
            </div>

            <div className="mbreak">
              <div className="glab">
                Hard filters · <b>your demand</b> vs lot
              </div>
              {current.hard.map((h, i) => (
                <div className="hrow" key={i}>
                  <span className="want">{h.want}</span>
                  <span className="got">
                    <span className="ck">✓</span>
                    {h.got}
                  </span>
                </div>
              ))}
            </div>

            <div className="mbreak">
              <div className="glab">Soft traits matched</div>
              <div className="softchips">
                {current.soft.map((s, i) =>
                  s.m >= 1 ? (
                    <span className="softchip" key={i}>
                      <span className="ck">✓</span>
                      {s.t}
                    </span>
                  ) : (
                    <span className="softchip partial" key={i}>
                      {s.t} · partial
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="supplier">
              <div className="sr">
                <div className="av">{current.supplier.charAt(0)}</div>
                <div>
                  <div className="sn">{current.supplier}</div>
                  <div className="stars">
                    <span className="st">{stars(current.rating)}</span>
                    <span className="rv">{current.rating}/5</span>
                    <span className="rc">({current.reviews} sold)</span>
                  </div>
                </div>
              </div>
              {current.risks.length > 0 && <div className="riskflag">{current.risks[0]}</div>}
              <div className="aiprofile">
                <span className="ailabel">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                  </svg>
                  AI seller profile
                </span>
                {current.aiProfile}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && current && (
        <div className="mcontrols">
          <button className="pass" onClick={() => decide("pass")}>
            Pass
          </button>
          <button className="add" onClick={() => decide("add")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Add to basket
          </button>
        </div>
      )}
    </section>
  );
}
