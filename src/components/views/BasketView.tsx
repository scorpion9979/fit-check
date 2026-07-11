"use client";

import type { MatchView } from "@/lib/fitcheck/matchView";

interface Props {
  basket: MatchView[];
  onRemove: (id: string) => void;
  toast: (title: string, sub?: string) => void;
}

export default function BasketView({ basket, onRemove, toast }: Props) {
  const lots = basket.length;
  const units = basket.reduce((a, b) => a + b.units, 0);
  const total = basket.reduce((a, b) => a + b.lotVal, 0);

  return (
    <section className="view flexcol active">
      <div className="vhead">
        <h2>Basket</h2>
        <div className="s">Compare lots before you negotiate.</div>
      </div>

      {lots === 0 ? (
        <div className="bempty">
          <div className="big">Basket&apos;s empty</div>
          <p>Swipe right or tap Add on a match to drop the lot in here.</p>
        </div>
      ) : (
        <>
          <div className="blist">
            {basket.map((b) => (
              <div className="bitem" key={b.id}>
                <div className="bthumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.gallery[0] ?? ""} alt="" />
                </div>
                <div className="bi">
                  <div className="bt">{b.title}</div>
                  <div className="bm">
                    {b.price} · {b.match}% match · Grade {b.grade}
                  </div>
                </div>
                <button className="brm" aria-label="Remove" onClick={() => onRemove(b.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="bsummary">
            <div className="sr">
              <span className="k">Lots</span>
              <span className="v tnum">{lots}</span>
            </div>
            <div className="sr">
              <span className="k">Units (at MOQ)</span>
              <span className="v tnum">{units}</span>
            </div>
            <div className="sr">
              <span className="k">Total</span>
              <span className="big tnum">£{total}</span>
            </div>
            <button
              className="bcta"
              onClick={() => toast("Handpick requested", "A Fleek sourcing lead will call to confirm the lots.")}
            >
              Request a Handpick call
            </button>
          </div>
        </>
      )}
    </section>
  );
}
