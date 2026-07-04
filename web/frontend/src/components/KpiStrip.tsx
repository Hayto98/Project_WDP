import type { Kpi } from "../data/types";
import { formatInt, formatPercent } from "../lib/format";
import { IconArrowUp } from "./icons";

interface Props {
  kpis: Kpi[];
  loading?: boolean;
}

export function KpiStrip({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="kpi-strip" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi" key={i}>
            <div className="skel skel--line" style={{ width: "60%" }} />
            <div className="skel skel--line" style={{ width: "40%", height: 28 }} />
            <div className="skel skel--line" style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="kpi-strip">
      {kpis.map((k) => (
        <article className="kpi" key={k.id}>
          <p className="kpi__label">{k.label}</p>
          <p className="kpi__value num">
            {k.format === "percent" ? formatPercent(k.value) : formatInt(k.value)}
          </p>
          <p className={`kpi__hint kpi__hint--${k.deltaKind ?? "neutral"}`}>
            {k.deltaKind === "up" && <IconArrowUp width={13} height={13} />}
            {k.hint}
          </p>
        </article>
      ))}
    </div>
  );
}
