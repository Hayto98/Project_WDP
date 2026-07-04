import { useState } from "react";
import type { AiInsight } from "../data/types";
import { formatInt } from "../lib/format";
import { IconChevron, IconSparkle } from "./icons";

interface Props {
  ai: AiInsight;
}

export function AiInsights({ ai }: Props) {
  const [openEvidence, setOpenEvidence] = useState(false);

  return (
    <div className="ai">
      <p className="ai__summary">{ai.summary}</p>

      <h3 className="ai__subhead">Hướng nghiên cứu gợi ý</h3>
      <ul className="ai__dirs">
        {ai.directions.map((d) => (
          <li className="ai__dir" key={d.topic}>
            <span className="ai__dir-icon" aria-hidden>
              <IconSparkle width={16} height={16} />
            </span>
            <div>
              <p className="ai__dir-topic">{d.topic}</p>
              <p className="ai__dir-why">{d.rationale}</p>
            </div>
          </li>
        ))}
      </ul>

      <button
        className="ai__evidence-toggle"
        onClick={() => setOpenEvidence((v) => !v)}
        aria-expanded={openEvidence}
      >
        <IconChevron
          width={16}
          height={16}
          style={{ transform: openEvidence ? "rotate(180deg)" : "none", transition: "transform var(--dur-2) var(--ease-out)" }}
        />
        Căn cứ phân tích ({ai.evidence.length})
      </button>

      {openEvidence && (
        <ul className="ai__evidence">
          {ai.evidence.map((e) => (
            <li key={e.label}>
              <span>{e.label}</span>
              <span className="num">{formatInt(e.papers)} bài</span>
            </li>
          ))}
        </ul>
      )}

      <p className="ai__disclaimer">
        Tóm tắt do AI tạo từ abstract &amp; metadata — hãy kiểm tra căn cứ trước khi trích dẫn.
      </p>
    </div>
  );
}
