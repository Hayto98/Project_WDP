import { useLayoutEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint, TrendSeries } from "../data/types";
import { formatCompact, formatInt } from "../lib/format";

interface Props {
  data: TrendPoint[];
  series: TrendSeries[];
  /** changes when theme flips, so colors re-resolve */
  themeKey: string;
  /** hide the built-in legend when an external control drives series selection */
  hideLegend?: boolean;
}

/** Resolve CSS custom properties to literal color strings — SVG presentation
 *  attributes (stroke/fill) don't evaluate var(). */
function useResolvedColors(tokens: string[], dep: string) {
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

const AXIS_TOKENS = ["--border", "--border-strong", "--ink-muted"];
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export function TrendChart({ data, series, themeKey, hideLegend = false }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const colors = useResolvedColors([...series.map((s) => s.token), ...AXIS_TOKENS], themeKey);

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (next.size === series.length) return prev; // never hide everything
      return next;
    });

  const c = (t: string) => colors[t] || "currentColor";

  return (
    <div className="trend">
      {!hideLegend && (
        <ul className="legend" role="group" aria-label="Chọn lĩnh vực hiển thị">
          {series.map((s) => {
            const off = hidden.has(s.key);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  className={`legend__chip ${off ? "is-off" : ""}`}
                  onClick={() => toggle(s.key)}
                  aria-pressed={!off}
                >
                  <span className="legend__dot" style={{ background: `var(${s.token})` }} />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="trend__chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={c("--border")} vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: c("--ink-muted"), fontSize: 12, fontFamily: MONO }}
              tickLine={false}
              axisLine={{ stroke: c("--border") }}
              dy={6}
            />
            <YAxis
              tick={{ fill: c("--ink-muted"), fontSize: 12, fontFamily: MONO }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => formatCompact(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: c("--border-strong"), strokeWidth: 1 }}
              content={(p) => (
                <TrendTooltip
                  active={p.active}
                  label={p.label as string}
                  payload={(p.payload as unknown as TipEntry[]) ?? []}
                  series={series}
                />
              )}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={c(s.token)}
                strokeWidth={2}
                dot={false}
                hide={hidden.has(s.key)}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TipEntry {
  dataKey?: string | number;
  value?: number | string;
}

function TrendTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload: TipEntry[];
  label?: string;
  series: TrendSeries[];
}) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="chart-tip">
      <p className="chart-tip__head num">{label}</p>
      <ul>
        {rows.map((p, i) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <li key={`${p.dataKey}-${i}`}>
              <span className="chart-tip__dot" style={{ background: `var(${s?.token})` }} />
              <span className="chart-tip__name">{s?.label}</span>
              <span className="chart-tip__val num">{formatInt(Number(p.value))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
