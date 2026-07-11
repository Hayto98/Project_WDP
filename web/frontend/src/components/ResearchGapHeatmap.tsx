import { useState } from "react";
import type { AxisOption, GapCell } from "../data/types";
import { formatInt } from "../lib/format";

interface Props {
  fields: Array<string | AxisOption>;
  aspects: Array<string | AxisOption>;
  gaps: GapCell[];
}

function heatVar(density: number): string {
  const step = Math.min(5, Math.round(density * 5));
  return `var(--heat-${step})`;
}

export function ResearchGapHeatmap({ fields, aspects, gaps }: Props) {
  const [active, setActive] = useState<GapCell | null>(null);
  const fieldItems = fields.map(normalizeAxisItem).filter(Boolean) as AxisOption[];
  const aspectItems = aspects.map(normalizeAxisItem).filter(Boolean) as AxisOption[];
  const cell = (f: string, a: string): GapCell => (
    gaps.find((g) => sameAxis(g.field, f) && sameAxis(g.aspect, a)) ?? {
      field: f,
      aspect: a,
      density: 0,
      papers: 0,
      gap: false,
    }
  );

  return (
    <div className="heatmap">
      <div
        className="heatmap__grid"
        style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${aspectItems.length}, 1fr)` }}
      >
        <div className="heatmap__corner" />
        {aspectItems.map((a) => (
          <div key={a.key} className="heatmap__col-head">
            {a.label}
          </div>
        ))}

        {fieldItems.map((f) => (
          <div className="heatmap__row" key={f.key} style={{ display: "contents" }}>
            <div className="heatmap__row-head">{f.label}</div>
            {aspectItems.map((a) => {
              const c = cell(f.label, a.label);
              return (
                <button
                  key={`${f.key}-${a.key}`}
                  type="button"
                  className={`heatmap__cell ${c.gap ? "is-gap" : ""} ${
                    active === c ? "is-active" : ""
                  }`}
                  style={{ background: heatVar(c.density) }}
                  onMouseEnter={() => setActive(c)}
                  onFocus={() => setActive(c)}
                  onMouseLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                  aria-label={`${f.label} · ${a.label}: ${formatInt(c.papers)} bài${
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

function normalizeAxisItem(value: string | Partial<AxisOption> | null | undefined): AxisOption | null {
  if (typeof value === "string") return { key: value, label: value };
  if (!value) return null;
  const label = value.label || value.key;
  if (!label) return null;
  return { key: value.key || label, label };
}

function sameAxis(a: unknown, b: string) {
  if (typeof a === "string") return a === b;
  if (a && typeof a === "object") {
    const item = normalizeAxisItem(a as Partial<AxisOption>);
    return item?.label === b || item?.key === b;
  }
  return false;
}
