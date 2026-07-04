import type { TrendingPaper } from "../data/types";
import { formatInt } from "../lib/format";
import { IconExternal, IconFlame } from "./icons";

interface Props {
  papers: TrendingPaper[];
}

export function TrendingPapers({ papers }: Props) {
  const max = Math.max(...papers.map((p) => p.views30d));
  return (
    <ol className="trending">
      {papers.map((p, i) => (
        <li className="trending__item" key={p.id}>
          <span className="trending__rank num">{i + 1}</span>
          <div className="trending__main">
            <a className="trending__title" href={p.url} target="_blank" rel="noreferrer">
              {p.title}
              <IconExternal className="trending__ext" width={14} height={14} />
            </a>
            <p className="trending__meta">
              {p.authors} · <span className="num">{p.year}</span> · {p.source}
            </p>
            <div className="trending__bar" aria-hidden>
              <span style={{ width: `${(p.views30d / max) * 100}%` }} />
            </div>
          </div>
          <div className="trending__views">
            <span className="trending__views-num num">
              <IconFlame width={13} height={13} />
              {formatInt(p.views30d)}
            </span>
            <span className="trending__views-label">lượt / 30 ngày</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
