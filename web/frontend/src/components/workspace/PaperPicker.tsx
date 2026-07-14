import { useState, useEffect } from "react";
import { paperApi } from "../../lib/api";
import { IconSearch } from "../icons";

interface PaperPickerProps {
  value: string;
  onChange: (paperId: string) => void;
  libraryPapers: { id: string; title: string }[];
  disabled?: boolean;
}

export function PaperPicker({ value, onChange, libraryPapers, disabled }: PaperPickerProps) {
  const [tab, setTab] = useState<"library" | "search">("library");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; authors?: string[]; year?: number; source?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Debounce search
  useEffect(() => {
    if (tab !== "search") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      setLoading(true);
      setError("");
      paperApi.search({ q: query.trim(), limit: 10 })
        .then((res) => setResults(res.papers))
        .catch(() => setError("Có lỗi khi tìm kiếm"))
        .finally(() => setLoading(false));
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [query, tab]);

  return (
    <div className="paper-picker" style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      <div className="seg" role="group" style={{ display: "flex", width: "fit-content", marginBottom: "4px" }}>
        <button
          type="button"
          className={`seg__btn ${tab === "library" ? "is-active" : ""}`}
          onClick={() => setTab("library")}
          disabled={disabled}
        >
          Thư viện cá nhân
        </button>
        <button
          type="button"
          className={`seg__btn ${tab === "search" ? "is-active" : ""}`}
          onClick={() => setTab("search")}
          disabled={disabled}
        >
          Tìm kiếm toàn cục
        </button>
      </div>

      {tab === "library" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || libraryPapers.length === 0} className="input">
          {libraryPapers.every((paper) => paper.id !== value) && value && (
            <option value={value}>Bài báo hiện tại (không có trong thư viện)</option>
          )}
          {libraryPapers.map((paper) => (
            <option key={paper.id} value={paper.id}>
              {paper.title}
            </option>
          ))}
          {libraryPapers.length === 0 && <option value="" disabled>Thư viện trống</option>}
        </select>
      ) : (
        <div className="paper-picker__search" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
              <IconSearch width={16} height={16} />
            </span>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "32px", width: "100%" }}
              placeholder="Nhập tên bài báo để tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
            />
          </div>
          
          {loading && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Đang tìm kiếm...</div>}
          {error && <div style={{ fontSize: "12px", color: "var(--danger)" }}>{error}</div>}
          
          {!loading && results.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", background: "var(--surface)" }}>
              {results.map((paper) => (
                <button
                  key={paper.id}
                  type="button"
                  onClick={() => onChange(paper.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: paper.id === value ? "var(--primary-light, rgba(0,0,0,0.05))" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  <strong style={{ fontSize: "13px", color: paper.id === value ? "var(--primary)" : "var(--text-main)" }}>
                    {paper.title}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {paper.authors?.slice(0, 2).join(", ")} {paper.authors && paper.authors.length > 2 ? "et al." : ""} 
                    {paper.year ? ` · ${paper.year}` : ""} {paper.source ? ` · ${paper.source}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && !error && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Không tìm thấy bài báo nào.</div>
          )}
        </div>
      )}
    </div>
  );
}
