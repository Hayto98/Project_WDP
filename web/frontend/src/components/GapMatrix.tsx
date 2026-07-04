import { GAP_ASPECTS, isGap, type GapItem } from "../data/gapSample";
import { formatInt } from "../lib/format";

interface Props {
  items: GapItem[];
  fields: { key: string; label: string; token: string }[];
  aspects: string[];
  densityThreshold: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function heatVar(density: number): string {
  const step = Math.min(5, Math.round(density * 5));
  return `var(--heat-${step})`;
}

export function GapMatrix({
  items,
  fields,
  aspects,
  densityThreshold,
  selectedId,
  onSelect,
}: Props) {
  const cell = (fk: string, a: string) =>
    items.find((i) => i.fieldKey === fk && i.aspect === a);

  const shownAspects = GAP_ASPECTS.filter((a) => aspects.includes(a));

  return (
    <div className="heatmap">
      <div
        className="heatmap__grid"
        style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${shownAspects.length}, 1fr)` }}
      >
        <div className="heatmap__corner" />
        {shownAspects.map((a) => (
          <div key={a} className="heatmap__col-head">
            {a}
          </div>
        ))}

        {fields.map((f) => (
          <div className="heatmap__row" key={f.key} style={{ display: "contents" }}>
            <div className="heatmap__row-head">{f.label}</div>
            {shownAspects.map((a) => {
              const c = cell(f.key, a);
              if (!c) return <div key={a} />;
              const gap = isGap(c, densityThreshold);
              const selected = selectedId === c.id;
              return (
                <button
                  key={a}
                  type="button"
                  className={`heatmap__cell ${gap ? "is-gap" : ""} ${selected ? "is-selected" : ""}`}
                  style={{ background: heatVar(c.density) }}
                  onClick={() => onSelect(c.id)}
                  onFocus={() => onSelect(c.id)}
                  aria-pressed={selected}
                  aria-label={`${f.label} · ${a}: ${formatInt(c.papers)} bài, mật độ ${Math.round(
                    c.density * 100,
                  )}%, quan tâm ${Math.round(c.interest * 100)}%${gap ? ", khoảng trống tiềm năng" : ""}`}
                >
                  {gap && (
                    <span className="heatmap__gap-mark" aria-hidden>
                      ◆
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="heatmap__foot">
        <div className="heatmap__scale" aria-hidden>
          <span className="heatmap__scale-label">Ít công bố</span>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <span key={s} className="heatmap__swatch" style={{ background: `var(--heat-${s})` }} />
          ))}
          <span className="heatmap__scale-label">Nhiều</span>
        </div>
        <p className="heatmap__legend-gap">
          <span className="heatmap__gap-mark" aria-hidden>
            ◆
          </span>{" "}
          Khoảng trống tiềm năng
        </p>
      </div>
    </div>
  );
}
