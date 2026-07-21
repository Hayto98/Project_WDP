import { useMemo, useState, useEffect, useRef } from "react";
import type { CoocEdge, CoocNode } from "../data/trendsSample";
import { TREND_TOPICS } from "../data/trendsSample";
import type { TrendSeries } from "../data/types";

interface Props {
  nodes: CoocNode[];
  edges: CoocEdge[];
  /** topic keys currently selected in the control bar */
  selected: Set<string>;
  /** optional series for color tokens (corpus API keys) */
  topics?: TrendSeries[];
  themeKey: string;
}

const VB = { w: 440, h: 360 };
const CX = VB.w / 2;
const CY = VB.h / 2;
const R = 100; // Reduced radius to give more room for beautiful curved text layout

// Helper to slugify keys/labels for robust matching between nodes and topics
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "other";

export function CoocNetwork({ nodes, edges, selected, topics }: Props) {
  const palette = topics?.length ? topics : TREND_TOPICS;
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const active = hovered || focused;
  const readoutRef = useRef<HTMLDivElement>(null);

  // Slugify-aware topic matcher to get color variables
  const getTopicToken = (nodeTopic: string) => {
    const slug = slugify(nodeTopic);
    const found = palette.find(
      (t) => slugify(t.key) === slug || slugify(t.label) === slug
    );
    return found?.token && found.token !== "" ? found.token : "--primary";
  };

  const shown = useMemo(() => {
    const map = new Map<string, typeof nodes[0]>();
    for (const n of nodes) {
      if (selected.has(n.topic)) map.set(n.id, n);
    }
    return Array.from(map.values());
  }, [nodes, selected]);
  const ids = useMemo(() => new Set(shown.map((n) => n.id)), [shown]);
  const shownEdges = useMemo(
    () => edges.filter((e) => ids.has(e.a) && ids.has(e.b)),
    [edges, ids],
  );

  // Clean, evenly distributed circular layout to avoid overlaps
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

  // Keep all edges to ensure the graph is fully connected and balanced
  const visibleEdges = useMemo(() => {
    return shownEdges;
  }, [shownEdges]);

  const activeNode = shown.find((n) => n.id === active);
  const activeLinks = active
    ? shownEdges
        .filter((e) => e.a === active || e.b === active)
        .map((e) => ({ id: e.a === active ? e.b : e.a, weight: e.weight }))
        .sort((x, y) => y.weight - x.weight)
    : [];

  useEffect(() => {
    if (readoutRef.current) readoutRef.current.scrollTop = 0;
  }, [active]);

  if (shown.length < 2) {
    return (
      <div className="cooc__hint">Chọn ít nhất 2 chủ đề để dựng mạng đồng xuất hiện từ khóa.</div>
    );
  }

  return (
    <div className="cooc">
      <div className="cooc__canvas">
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" role="img" aria-label="Mạng đồng xuất hiện từ khóa">
          <defs>
            <filter id="cooc-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Subtle background boundary circle */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.35"
          />
          
          {/* Edges */}
          <g>
            {visibleEdges.map((e) => {
              const pa = pos[e.a];
              const pb = pos[e.b];
              if (!pa || !pb) return null;

              const isActive = active != null && (e.a === active || e.b === active);
              const dim = active != null && !isActive;

              // Force animation flow outward from the active node
              const startPos = e.a === active ? pa : pb;
              const endPos = e.a === active ? pb : pa;

              // Calculate midpoints and control points for elegant curves
              const mx = (startPos.x + endPos.x) / 2;
              const my = (startPos.y + endPos.y) / 2;
              
              // Active edges have a softer curve
              const cxActive = mx * 0.85 + CX * 0.15;
              const cyActive = my * 0.85 + CY * 0.15;
              
              // Inactive edges curve deeper towards the center to create a "dreamcatcher" web effect
              const cxInactive = mx * 0.65 + CX * 0.35;
              const cyInactive = my * 0.65 + CY * 0.35;

              const activeTopicToken = activeNode ? getTopicToken(activeNode.topic) : "--border-strong";
              return (
                <path
                  key={`${e.a}-${e.b}`}
                  d={isActive
                    ? `M ${startPos.x} ${startPos.y} Q ${cxActive} ${cyActive} ${endPos.x} ${endPos.y}`
                    : `M ${pa.x} ${pa.y} Q ${cxInactive} ${cyInactive} ${pb.x} ${pb.y}`
                  }
                  fill="none"
                  stroke={isActive ? `var(${activeTopicToken})` : "var(--primary)"}
                  strokeWidth={isActive ? 1.8 + e.weight * 0.35 : 0.6 + e.weight * 0.1}
                  strokeOpacity={isActive ? 1 : dim ? 0 : 0.5}
                  className={isActive ? "cooc__edge--active" : "cooc__edge"}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {shown.map((n) => {
              const p = pos[n.id];
              if (!p) return null;
              const r = 5 + (n.freq / 100) * 11;
              const inFocus = !neighbors || neighbors.has(n.id);
              const isActive = n.id === active;
              const token = getTopicToken(n.topic);
              const rightSide = Math.cos(p.ang) >= -0.01;
              const lx = p.x + Math.cos(p.ang) * (r + 7);
              const ly = p.y + Math.sin(p.ang) * (r + 7);

              return (
                <g
                  key={n.id}
                  className="cooc__node"
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.label}, tần suất ${n.freq}`}
                  opacity={inFocus ? 1 : 0.2}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setFocused((prev) => (prev === n.id ? null : n.id))}
                  onFocus={() => setFocused(n.id)}
                  onBlur={() => setFocused(null)}
                >
                  {/* Active highlight ring */}
                  {isActive && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r + 4}
                      fill={`var(${token})`}
                      fillOpacity="0.15"
                      stroke={`var(${token})`}
                      strokeOpacity="0.3"
                      strokeWidth="1"
                    />
                  )}
                  {/* Base Surface masking circle (hides edges underneath) */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="var(--surface)"
                  />
                  {/* Main Colored Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={`var(${token})`}
                    fillOpacity={isActive ? 1 : 0.25}
                    stroke={`var(${token})`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeOpacity={isActive ? 1 : 0.8}
                    filter={isActive ? "url(#cooc-glow)" : undefined}
                  />
                  {/* Specular highlight dot for premium glass bead effect */}
                  <circle
                    cx={p.x - r * 0.3}
                    cy={p.y - r * 0.3}
                    r={r * 0.22}
                    fill="white"
                    fillOpacity={isActive ? 0.35 : 0.2}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Text Label with Halo stroke */}
                  <text
                    x={lx}
                    y={ly}
                    dy="0.32em"
                    textAnchor={rightSide ? "start" : "end"}
                    className="cooc__label"
                    fill={inFocus ? (isActive ? `var(${token})` : "var(--ink)") : "var(--ink-muted)"}
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

      {/* Readout panel */}
      <div className="cooc__readout" ref={readoutRef} aria-live="polite">
        {activeNode ? (
          <>
            {/* Header */}
            <div className="cooc__ro-header">
              <span
                className="cooc__ro-swatch"
                style={{ background: `var(${getTopicToken(activeNode.topic)})` }}
              />
              <div>
                <p className="cooc__ro-title">{activeNode.label}</p>
                <p className="cooc__ro-sub">
                  Tần suất <span className="cooc__ro-freq">{activeNode.freq}</span>
                </p>
              </div>
            </div>

            {/* Frequency bar */}
            <div className="cooc__ro-freq-bar-wrap">
              <div
                className="cooc__ro-freq-bar-fill"
                style={{
                  width: `${activeNode.freq}%`,
                  background: `var(${getTopicToken(activeNode.topic)})`,
                }}
              />
            </div>

            {/* Stats row */}
            <div className="cooc__ro-stats">
              <div className="cooc__ro-stat">
                <span className="cooc__ro-stat-val">{activeLinks.length}</span>
                <span className="cooc__ro-stat-lbl">Liên kết</span>
              </div>
              <div className="cooc__ro-stat-div" />
              <div className="cooc__ro-stat">
                <span className="cooc__ro-stat-val">
                  {activeLinks.reduce((a, l) => a + l.weight, 0)}
                </span>
                <span className="cooc__ro-stat-lbl">Tổng trọng số</span>
              </div>
            </div>

            {/* Connected keywords */}
            {activeLinks.length > 0 && (
              <>
                <p className="cooc__ro-section-label">Từ khóa liên kết</p>
                <ul className="cooc__ro-list">
                  {activeLinks.map((l) => {
                    const linkedNode = shown.find((n) => n.id === l.id);
                    return (
                      <li
                        key={l.id}
                        className="cooc__ro-item"
                        onMouseEnter={() => setHovered(l.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <span
                          className="cooc__ro-item-dot"
                          style={{ background: `var(${getTopicToken(linkedNode?.topic ?? "")})` }}
                        />
                        <span className="cooc__ro-item-label">{linkedNode?.label}</span>
                        <div className="cooc__ro-bar">
                          <div
                            className="cooc__ro-bar-fill"
                            style={{
                              width: `${(l.weight / 5) * 100}%`,
                              background: `var(${getTopicToken(activeNode.topic)})`,
                            }}
                          />
                        </div>
                        <span className="cooc__ro-item-weight">{l.weight}/5</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        ) : (
          <div className="cooc__ro-idle">
            <svg
              className="cooc__ro-idle-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <p className="cooc__ro-idle-title">Di chuột hoặc nhấn vào từ khóa</p>
            <p className="cooc__ro-idle-sub">
              Kích thước phản ánh tần suất. Độ đậm cạnh phản ánh mức đồng xuất hiện trong corpus.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
