import { useLayoutEffect, useState } from "react";
import { GAP_FIELDS, type GapItem } from "../data/gapSample";

interface Props {
  items: GapItem[];
  densityThreshold: number;
  interestThreshold?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  themeKey: string;
}

const VB = { w: 470, h: 300 };
const M = { l: 46, r: 16, t: 16, b: 36 };
const PW = VB.w - M.l - M.r;
const PH = VB.h - M.t - M.b;

function useResolved(tokens: string[], dep: string) {
  const [map, setMap] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const t of tokens) next[t] = cs.getPropertyValue(t).trim();
    setMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return map;
}

export function GapScatter({
  items,
  densityThreshold,
  interestThreshold = 0.55,
  selectedId,
  onSelect,
  themeKey,
}: Props) {
  const colors = useResolved(
    [...GAP_FIELDS.map((f) => f.token), "--border", "--border-strong", "--ink-muted", "--ink-faint", "--surface", "--primary"],
    themeKey,
  );
  const c = (t: string) => colors[t] || "currentColor";

  const x = (d: number) => M.l + d * PW;
  const y = (i: number) => M.t + (1 - i) * PH;

  const gapX = x(densityThreshold);
  const gapY = y(interestThreshold);

  return (
    <div className="gapscatter">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" role="img" aria-label="Biểu đồ phân tán tiềm năng theo mật độ">
        {/* gap region: low density (left) + high interest (top) */}
        <rect
          x={M.l}
          y={M.t}
          width={gapX - M.l}
          height={gapY - M.t}
          fill={c("--primary")}
          fillOpacity={0.08}
        />
        <text x={M.l + 6} y={M.t + 14} className="gapscatter__zone" fill={c("--ink-muted")}>
          Vùng khoảng trống
        </text>

        {/* axes */}
        <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + PH} stroke={c("--border-strong")} />
        <line x1={M.l} y1={M.t + PH} x2={M.l + PW} y2={M.t + PH} stroke={c("--border-strong")} />

        {/* threshold guides */}
        <line
          x1={gapX}
          y1={M.t}
          x2={gapX}
          y2={M.t + PH}
          stroke={c("--primary")}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <line
          x1={M.l}
          y1={gapY}
          x2={M.l + PW}
          y2={gapY}
          stroke={c("--primary")}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />

        {/* tick labels */}
        {[0, 0.5, 1].map((t) => (
          <text
            key={`x${t}`}
            x={x(t)}
            y={M.t + PH + 18}
            textAnchor="middle"
            className="gapscatter__tick"
            fill={c("--ink-faint")}
          >
            {t * 100}%
          </text>
        ))}
        {[0, 0.5, 1].map((t) => (
          <text
            key={`y${t}`}
            x={M.l - 8}
            y={y(t) + 3}
            textAnchor="end"
            className="gapscatter__tick"
            fill={c("--ink-faint")}
          >
            {t * 100}%
          </text>
        ))}
        <text x={M.l + PW / 2} y={VB.h - 4} textAnchor="middle" className="gapscatter__axis" fill={c("--ink-muted")}>
          Mật độ công bố →
        </text>
        <text
          x={-(M.t + PH / 2)}
          y={12}
          transform="rotate(-90)"
          textAnchor="middle"
          className="gapscatter__axis"
          fill={c("--ink-muted")}
        >
          Mức quan tâm →
        </text>

        {/* points */}
        {items.map((it) => {
          const selected = it.id === selectedId;
          return (
            <g
              key={it.id}
              tabIndex={0}
              role="button"
              aria-label={`${it.fieldLabel} · ${it.aspect}: mật độ ${Math.round(
                it.density * 100,
              )}%, quan tâm ${Math.round(it.interest * 100)}%`}
              className="gapscatter__pt"
              onMouseEnter={() => onSelect(it.id)}
              onClick={() => onSelect(it.id)}
              onFocus={() => onSelect(it.id)}
            >
              <circle
                cx={x(it.density)}
                cy={y(it.interest)}
                r={selected ? 7.5 : 5}
                fill={c(it.token)}
                fillOpacity={selected ? 1 : 0.78}
                stroke={selected ? c("--surface") : "transparent"}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
