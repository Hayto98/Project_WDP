import { useState, type CSSProperties } from "react";
import { formatInt } from "../lib/format";

export interface OpportunityMapItem {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  aspect: string;
  density: number;
  papers: number;
  gap: boolean;
  interest?: number;
  score?: number;
}

interface AxisItem {
  key: string;
  label: string;
}

interface Props {
  items: OpportunityMapItem[];
  fields?: AxisItem[];
  aspects?: string[];
  mode?: "matrix" | "summary";
  densityThreshold?: number;
  interestThreshold?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

type OpportunityStatus = "opportunity" | "sparse" | "developing" | "established";

const STATUS_LABELS: Record<OpportunityStatus, string> = {
  opportunity: "Cơ hội",
  sparse: "Thiếu dữ liệu",
  developing: "Đang phát triển",
  established: "Đã phổ biến",
};

export function ResearchOpportunityMap({
  items,
  fields = [],
  aspects = [],
  mode = "matrix",
  densityThreshold = 0.35,
  interestThreshold = 0.55,
  selectedId = null,
  onSelect,
}: Props) {
  const [view, setView] = useState<"priority" | "all">("priority");
  if (mode === "summary") return <OpportunitySummary items={items} />;

  const gapCount = items.filter((item) => item.gap).length;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const activeView = gapCount > 0 ? view : "all";
  const priorityItems = [...items]
    .filter((item) => item.gap)
    .sort((a, b) => scoreFor(b) - scoreFor(a) || a.density - b.density);
  const gridTemplate = `minmax(150px, 1.3fr) repeat(${aspects.length}, minmax(96px, 1fr))`;
  const gridStyle = { "--opportunity-grid": gridTemplate } as CSSProperties;

  return (
    <section className="opportunity-map" aria-label="Bản đồ cơ hội nghiên cứu theo lĩnh vực và khía cạnh">
      <div className="opportunity-map__summary">
        <div>
          <strong>{gapCount} khoảng trống vượt ngưỡng</strong>
          <span>
            Mật độ ≤ {Math.round(densityThreshold * 100)}% · Quan tâm ≥{" "}
            {Math.round(interestThreshold * 100)}% · Điểm = Quan tâm × Độ khan hiếm
          </span>
        </div>
        <div className="opportunity-map__view-switch" role="tablist" aria-label="Chế độ xem cơ hội nghiên cứu">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "priority"}
            className={activeView === "priority" ? "is-active" : ""}
            onClick={() => setView("priority")}
            disabled={gapCount === 0}
          >
            Cơ hội ưu tiên ({gapCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "all"}
            className={activeView === "all" ? "is-active" : ""}
            onClick={() => setView("all")}
          >
            Toàn bộ bản đồ ({items.length})
          </button>
        </div>
      </div>

      {activeView === "priority" ? (
        <ol className="opportunity-priority">
          {priorityItems.map((item, index) => (
            <li key={item.id}>
              <PriorityOpportunity
                item={item}
                rank={index + 1}
                selected={selectedId === item.id}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="opportunity-map__status-key" aria-label="Các trạng thái trong bản đồ">
            {(Object.keys(STATUS_LABELS) as OpportunityStatus[]).map((status) => (
              <span key={status} className={`opportunity-map__key opportunity-map__key--${status}`}>
                {STATUS_LABELS[status]}
              </span>
            ))}
          </div>

          <div className="opportunity-map__matrix">
            <div className="opportunity-map__header" style={gridStyle} aria-hidden>
              <div className="opportunity-map__axis">
                <span>Khía cạnh →</span>
                <strong>Lĩnh vực ↓</strong>
              </div>
              {aspects.map((aspect) => (
                <div key={aspect} className="opportunity-map__column-label">
                  {aspect}
                </div>
              ))}
            </div>

            {fields.map((field) => (
              <div key={field.key} className="opportunity-map__row" style={gridStyle}>
                <div className="opportunity-map__field">{field.label}</div>
                {aspects.map((aspect) => {
                  const item = items.find(
                    (candidate) => candidate.fieldKey === field.key && candidate.aspect === aspect,
                  );
                  if (!item) {
                    return (
                      <div key={aspect} className="opportunity-map__empty-cell">
                        <span className="opportunity-map__cell-aspect">{aspect}</span>
                        <span>Chưa có dữ liệu</span>
                      </div>
                    );
                  }

                  const status = statusFor(item);
                  const statusLabel = STATUS_LABELS[status];
                  const score = scoreFor(item);
                  const degree = degreeFor(score);
                  const isSelected = selectedId === item.id;
                  const description = `${field.label} · ${aspect}: ${statusLabel}, ${formatInt(
                    item.papers,
                  )} bài, điểm cơ hội ${Math.round(score * 100)} (${degree.label}), mật độ ${Math.round(
                    item.density * 100,
                  )}%${
                    typeof item.interest === "number"
                      ? `, quan tâm ${Math.round(item.interest * 100)}%`
                      : ""
                  }`;

                  return (
                    <button
                      key={aspect}
                      type="button"
                      className={`opportunity-map__cell opportunity-map__cell--${status} ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() => onSelect?.(item.id)}
                      aria-pressed={isSelected}
                      aria-label={description}
                      title={description}
                    >
                      <span className="opportunity-map__cell-aspect">{aspect}</span>
                      <strong>{statusLabel}</strong>
                      <span className={`opportunity-map__cell-score opportunity-degree--${degree.key}`}>
                        <span className="num">{Math.round(score * 100)}</span>
                        <span>{degree.label}</span>
                      </span>
                      <span className="opportunity-meter opportunity-meter--cell" aria-hidden>
                        <span style={{ width: `${Math.round(score * 100)}%` }} />
                      </span>
                      <span className="opportunity-map__cell-metrics num">
                        {Math.round(item.density * 100)}% mật độ · {formatInt(item.papers)} bài
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="opportunity-map__selection" role="status" aria-live="polite">
          <div>
            <strong>{selected.fieldLabel}</strong>
            <span aria-hidden>×</span>
            <strong>{selected.aspect}</strong>
            <span
              className={`opportunity-map__selection-status opportunity-map__selection-status--${statusFor(
                selected,
              )}`}
            >
              {STATUS_LABELS[statusFor(selected)]}
            </span>
          </div>
          <div className="opportunity-map__selection-metrics num">
            <span>
              Điểm {Math.round(scoreFor(selected) * 100)} · {degreeFor(scoreFor(selected)).label}
            </span>
            <span>{formatInt(selected.papers)} bài</span>
            <span>Mật độ {Math.round(selected.density * 100)}%</span>
            {typeof selected.interest === "number" && (
              <span>Quan tâm {Math.round(selected.interest * 100)}%</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function OpportunitySummary({ items }: { items: OpportunityMapItem[] }) {
  const gapItems = items.filter((item) => item.gap);
  const ranked = [...(gapItems.length ? gapItems : items)]
    .sort((a, b) => scoreFor(b) - scoreFor(a) || b.papers - a.papers)
    .slice(0, 5);
  const gapCount = gapItems.length;

  return (
    <section className="opportunity-summary" aria-label="Cơ hội nghiên cứu nổi bật">
      <div className="opportunity-summary__head">
        <div>
          <strong>{gapCount} khoảng trống nổi bật</strong>
          <span>Xếp hạng theo Điểm cơ hội = Quan tâm × Độ khan hiếm</span>
        </div>
        <a href="#gap">Xem toàn bộ <span aria-hidden>→</span></a>
      </div>

      <ol className="opportunity-summary__list">
        {ranked.map((item, index) => {
          const score = scoreFor(item);
          const degree = degreeFor(score);
          return (
            <li key={item.id}>
              <a href="#gap" className="opportunity-summary__item">
                <span className="opportunity-summary__rank num">{index + 1}</span>
                <span className="opportunity-summary__topic">
                  <strong>{item.fieldLabel}</strong>
                  <span>{item.aspect}</span>
                </span>
                <span className={`opportunity-summary__status opportunity-degree--${degree.key}`}>
                  {degree.label}
                </span>
                <span className="opportunity-summary__metrics num">
                  <strong>Điểm {Math.round(score * 100)}</strong>
                  <span className="opportunity-meter" aria-hidden>
                    <span style={{ width: `${Math.round(score * 100)}%` }} />
                  </span>
                </span>
                <span className="opportunity-summary__arrow" aria-hidden>→</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PriorityOpportunity({
  item,
  rank,
  selected,
  onSelect,
}: {
  item: OpportunityMapItem;
  rank: number;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const score = scoreFor(item);
  const degree = degreeFor(score);
  const scarcity = 1 - item.density;
  const interest = item.interest ?? 0;

  return (
    <button
      type="button"
      className={`opportunity-priority__item ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect?.(item.id)}
      aria-pressed={selected}
      aria-label={`${item.fieldLabel} · ${item.aspect}: điểm cơ hội ${Math.round(score * 100)}, mức ${
        degree.label
      }, quan tâm ${Math.round(interest * 100)}%, độ khan hiếm ${Math.round(scarcity * 100)}%`}
    >
      <span className="opportunity-priority__rank num">{rank}</span>
      <span className="opportunity-priority__topic">
        <strong>{item.fieldLabel}</strong>
        <span>{item.aspect} · {formatInt(item.papers)} bài</span>
      </span>
      <span className="opportunity-priority__drivers">
        <span>
          <span>Quan tâm</span>
          <span className="opportunity-meter" aria-hidden>
            <span style={{ width: `${Math.round(interest * 100)}%` }} />
          </span>
          <strong className="num">{Math.round(interest * 100)}%</strong>
        </span>
        <span>
          <span>Khan hiếm</span>
          <span className="opportunity-meter" aria-hidden>
            <span style={{ width: `${Math.round(scarcity * 100)}%` }} />
          </span>
          <strong className="num">{Math.round(scarcity * 100)}%</strong>
        </span>
      </span>
      <span className={`opportunity-priority__score opportunity-degree--${degree.key}`}>
        <strong className="num">{Math.round(score * 100)}</strong>
        <span>{degree.label}</span>
      </span>
    </button>
  );
}

function statusFor(item: OpportunityMapItem): OpportunityStatus {
  if (item.gap) return "opportunity";
  if (item.density <= 0.35) return "sparse";
  if (item.density <= 0.7) return "developing";
  return "established";
}

function scoreFor(item: OpportunityMapItem) {
  const fallback = (item.interest ?? 0) * (1 - item.density);
  return Math.max(0, Math.min(1, item.score ?? fallback));
}

function degreeFor(score: number): { key: "very-high" | "high" | "medium" | "low"; label: string } {
  if (score >= 0.7) return { key: "very-high", label: "Rất cao" };
  if (score >= 0.5) return { key: "high", label: "Cao" };
  if (score >= 0.3) return { key: "medium", label: "Trung bình" };
  return { key: "low", label: "Thấp" };
}
