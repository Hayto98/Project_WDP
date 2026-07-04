import { useLayoutEffect, useMemo, useState } from "react";
import type { CoocEdge, CoocNode } from "../data/trendsSample";
import { TREND_TOPICS } from "../data/trendsSample";

interface Props {
  nodes: CoocNode[];
  edges: CoocEdge[];
  /** topic keys currently selected in the control bar */
  selected: Set<string>;
  themeKey: string;
}

const VB = { w: 440, h: 360 };
const CX = VB.w / 2;
const CY = VB.h / 2;
const R = 128;

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

export function CoocNetwork({ nodes, edges, selected, themeKey }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const colors = useResolved(
    [...TREND_TOPICS.map((t) => t.token), "--border", "--ink", "--ink-muted", "--surface"],
    themeKey,
  );
  const c = (t: string) => colors[t] || "currentColor";
  const topicToken = (topic: string) =>
    TREND_TOPICS.find((t) => t.key === topic)?.token ?? "--ink-muted";

  const shown = useMemo(() => nodes.filter((n) => selected.has(n.topic)), [nodes, selected]);
  const ids = useMemo(() => new Set(shown.map((n) => n.id)), [shown]);
  const shownEdges = useMemo(
    () => edges.filter((e) => ids.has(e.a) && ids.has(e.b)),
    [edges, ids],
  );

  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number; ang: number }> = {};
    const n = shown.length;
    shown.forEach((node, i) => {
      const ang = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      m[node.id] = { x: CX + Math.cos(ang) * R, y: CY + Math.sin(ang) * R, ang };
    });
    return m;
  }, [shown]);

  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of shownEdges) {
      if (e.a === active) set.add(e.b);
      if (e.b === active) set.add(e.a);
    }
    return set;
  }, [active, shownEdges]);

  const activeNode = shown.find((n) => n.id === active);
  const activeLinks = active
    ? shownEdges
        .filter((e) => e.a === active || e.b === active)
        .map((e) => ({ id: e.a === active ? e.b : e.a, weight: e.weight }))
        .sort((x, y) => y.weight - x.weight)
    : [];

  if (shown.length < 2) {
    return (
      <div className="cooc__hint">Chọn ít nhất 2 chủ đề để dựng mạng đồng xuất hiện từ khóa.</div>
    );
  }

  return (
    <div className="cooc">
      <div className="cooc__canvas">
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" role="img" aria-label="Mạng đồng xuất hiện từ khóa">
          <g>
            {shownEdges.map((e) => {
              const pa = pos[e.a];
              const pb = pos[e.b];
              const isActive = active != null && (e.a === active || e.b === active);
              const dim = active != null && !isActive;
              return (
                <line
                  key={`${e.a}-${e.b}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={isActive ? c(topicToken(activeNode!.topic)) : c("--ink")}
                  strokeWidth={1 + e.weight * 0.55}
                  strokeOpacity={dim ? 0.05 : isActive ? 0.7 : 0.12 + e.weight * 0.04}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <g>
            {shown.map((n) => {
              const p = pos[n.id];
              const r = 6 + (n.freq / 100) * 15;
              const inFocus = !neighbors || neighbors.has(n.id);
              const isActive = n.id === active;
              const rightHalf = Math.cos(p.ang) >= -0.01;
              const lx = p.x + Math.cos(p.ang) * (r + 6);
              const ly = p.y + Math.sin(p.ang) * (r + 6);
              return (
                <g
                  key={n.id}
                  className="cooc__node"
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.label}, tần suất ${n.freq}`}
                  opacity={inFocus ? 1 : 0.22}
                  onMouseEnter={() => setActive(n.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(n.id)}
                  onBlur={() => setActive(null)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={c(topicToken(n.topic))}
                    fillOpacity={isActive ? 1 : 0.82}
                    stroke={c("--surface")}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    dy="0.32em"
                    textAnchor={rightHalf ? "start" : "end"}
                    className="cooc__label"
                    fill={inFocus ? c("--ink") : c("--ink-muted")}
                    fontWeight={isActive ? 600 : 400}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="cooc__readout" aria-live="polite">
        {activeNode ? (
          <>
            <p className="cooc__ro-title">
              <span
                className="cooc__ro-dot"
                style={{ background: `var(${topicToken(activeNode.topic)})` }}
              />
              {activeNode.label}
            </p>
            <p className="cooc__ro-sub">
              Tần suất <span className="num">{activeNode.freq}</span> · {activeLinks.length} liên kết
            </p>
            <ul className="cooc__ro-list">
              {activeLinks.map((l) => {
                const node = shown.find((n) => n.id === l.id);
                return (
                  <li key={l.id}>
                    <span>{node?.label}</span>
                    <span className="cooc__ro-w">
                      {"●".repeat(l.weight)}
                      <span className="cooc__ro-wt">{"○".repeat(5 - l.weight)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="cooc__ro-empty">
            Di chuột (hoặc tab) lên một từ khóa để làm nổi cụm liên kết. Kích thước node theo tần
            suất, độ đậm cạnh theo mức đồng xuất hiện.
          </p>
        )}
      </div>
    </div>
  );
}
