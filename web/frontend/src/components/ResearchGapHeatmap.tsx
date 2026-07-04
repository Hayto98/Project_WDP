import { useState } from "react";
import type { GapCell } from "../data/types";
import { formatInt } from "../lib/format";

interface Props {
  fields: string[];
  aspects: string[];
  gaps: GapCell[];
}

function heatVar(density: number): string {
  const step = Math.min(5, Math.round(density * 5));
  return `var(--heat-${step})`;
}

export function ResearchGapHeatmap({ fields, aspects, gaps }: Props) {
  const [active, setActive] = useState<GapCell | null>(null);
  const cell = (f: string, a: string) =>
    gaps.find((g) => g.field === f && g.aspect === a)!;

  return (
    <div className="heatmap">
      <div
        className="heatmap__grid"
        style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${aspects.length}, 1fr)` }}
      >
        <div className="heatmap__corner" />
        {aspects.map((a) => (
          <div key={a} className="heatmap__col-head">
            {a}
          </div>
        ))}

        {fields.map((f) => (
          <div className="heatmap__row" key={f} style={{ display: "contents" }}>
            <div className="heatmap__row-head">{f}</div>
            {aspects.map((a) => {
              const c = cell(f, a);
              return (
                <button
                  key={a}
                  type="button"
                  className={`heatmap__cell ${c.gap ? "is-gap" : ""} ${
                    active === c ? "is-active" : ""
                  }`}
                  style={{ background: heatVar(c.density) }}
                  onMouseEnter={() => setActive(c)}
                  onFocus={() => setActive(c)}
                  onMouseLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                  aria-label={`${f} · ${a}: ${formatInt(c.papers)} bài${
                    c.gap ? ", khoảng trống tiềm năng" : ""
                  }`}
                >
                  {c.gap && <span className="heatmap__gap-mark" aria-hidden>◆</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="heatmap__foot">
        <div className="heatmap__scale" aria-hidden>
          <span className="heatmap__scale-label">Ít</span>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <span key={s} className="heatmap__swatch" style={{ background: `var(--heat-${s})` }} />
          ))}
          <span className="heatmap__scale-label">Nhiều</span>
        </div>
        <p className="heatmap__legend-gap">
          <span className="heatmap__gap-mark" aria-hidden>◆</span> Khoảng trống tiềm năng
        </p>
      </div>

      <p className="heatmap__readout num" role="status">
        {active
          ? `${active.field} · ${active.aspect} — ${formatInt(active.papers)} bài${
              active.gap ? "  ·  ◆ tiềm năng cao" : ""
            }`
          : "Di chuột / focus vào ô để xem mật độ công bố"}
      </p>
    </div>
  );
}
