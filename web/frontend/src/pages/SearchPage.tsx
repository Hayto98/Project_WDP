import { useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "../hooks/useTheme";
import { ThemeToggle } from "../components/ThemeToggle";
import { formatInt } from "../lib/format";
import {
  FIELDS,
  PAPERS,
  RELATED_KEYWORDS,
  SOURCES,
  TYPES,
  type PaperResult,
} from "../data/searchSample";
import {
  IconBookmark,
  IconChevron,
  IconExternal,
  IconFilter,
  IconPlus,
  IconQuote,
  IconSearch,
  IconX,
} from "../components/icons";

type Scope = "all" | "title" | "author";
type SortKey = "relevance" | "year" | "citations";
type CondOp = "AND" | "OR" | "NOT";
type Demo = "auto" | "loading" | "empty" | "error";

interface Condition {
  id: number;
  op: CondOp;
  term: string;
}

const YEAR_MIN = 2015;
const YEAR_MAX = 2025;
const PAGE_SIZE = 5;

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "title", label: "Tiêu đề" },
  { id: "author", label: "Tác giả" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "relevance", label: "Liên quan nhất" },
  { id: "year", label: "Mới nhất" },
  { id: "citations", label: "Trích dẫn nhiều" },
];

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function SearchPage({ theme, toggle }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [yearFrom, setYearFrom] = useState(YEAR_MIN);
  const [yearTo, setYearTo] = useState(YEAR_MAX);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState<Demo>("auto");
  const [facetsOpen, setFacetsOpen] = useState(false);

  const condId = useRef(1);
  const loadTimer = useRef<number | undefined>(undefined);

  const runSearch = (q: string) => {
    setSubmitted(q);
    setHasSearched(true);
    setPage(1);
    setLoading(true);
    setDemo("auto");
    window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 480);
  };

  useEffect(() => () => window.clearTimeout(loadTimer.current), []);

  // Re-filter briefly when facets/sort change after an initial search.
  useEffect(() => {
    if (!hasSearched) return;
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, sources, types, yearFrom, yearTo, conditions, sort]);

  const queryTokens = useMemo(
    () => submitted.toLowerCase().split(/\s+/).filter(Boolean),
    [submitted],
  );
  const andTerms = conditions.filter((c) => c.op === "AND" && c.term.trim());
  const orTerms = conditions.filter((c) => c.op === "OR" && c.term.trim());
  const notTerms = conditions.filter((c) => c.op === "NOT" && c.term.trim());

  const highlightTerms = useMemo(
    () => [...queryTokens, ...andTerms.map((c) => c.term), ...orTerms.map((c) => c.term)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submitted, conditions],
  );

  const results = useMemo(() => {
    const haystackFor = (p: PaperResult) => {
      if (scope === "title") return p.title.toLowerCase();
      if (scope === "author") return p.authors.join(" ").toLowerCase();
      return [p.title, p.authors.join(" "), p.abstract, p.keywords.join(" "), p.fields.join(" ")]
        .join(" ")
        .toLowerCase();
    };
    const count = (hay: string, term: string) => {
      const t = term.toLowerCase().trim();
      if (!t) return 0;
      let n = 0;
      let i = hay.indexOf(t);
      while (i !== -1) {
        n += 1;
        i = hay.indexOf(t, i + t.length);
      }
      return n;
    };

    const matched = PAPERS.filter((p) => {
      const hay = haystackFor(p);
      const title = p.title.toLowerCase();
      // facets
      if (fields.size && !p.fields.some((f) => fields.has(f))) return false;
      if (sources.size && !sources.has(p.source)) return false;
      if (types.size && !types.has(p.type)) return false;
      if (p.year < yearFrom || p.year > yearTo) return false;
      // NOT conditions always exclude
      for (const c of notTerms) if (hay.includes(c.term.toLowerCase().trim())) return false;
      // base: every query token + every AND term present
      const base =
        queryTokens.every((t) => hay.includes(t)) &&
        andTerms.every((c) => hay.includes(c.term.toLowerCase().trim()));
      const orHit =
        orTerms.length > 0 && orTerms.some((c) => hay.includes(c.term.toLowerCase().trim()));
      if (!(base || orHit)) return false;
      // stash score
      let score = 0;
      for (const t of [...queryTokens, ...andTerms.map((c) => c.term), ...orTerms.map((c) => c.term)]) {
        score += count(title, t) * 3 + count(hay, t);
      }
      (p as PaperResult & { _score?: number })._score = score + p.citations / 1000;
      return true;
    });

    matched.sort((a, b) => {
      if (sort === "year") return b.year - a.year || b.citations - a.citations;
      if (sort === "citations") return b.citations - a.citations;
      const sa = (a as PaperResult & { _score?: number })._score ?? 0;
      const sb = (b as PaperResult & { _score?: number })._score ?? 0;
      return sb - sa || b.citations - a.citations;
    });
    return matched;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, scope, conditions, fields, sources, types, yearFrom, yearTo, sort]);

  const activeFilterCount =
    fields.size +
    sources.size +
    types.size +
    (yearFrom !== YEAR_MIN || yearTo !== YEAR_MAX ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const status: "landing" | "loading" | "results" | "empty" | "error" =
    demo === "loading"
      ? "loading"
      : demo === "empty"
        ? "empty"
        : demo === "error"
          ? "error"
          : !hasSearched
            ? "landing"
            : loading
              ? "loading"
              : results.length === 0
                ? "empty"
                : "results";

  const toggleSet = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    apply(next);
  };

  const clearFilters = () => {
    setFields(new Set());
    setSources(new Set());
    setTypes(new Set());
    setYearFrom(YEAR_MIN);
    setYearTo(YEAR_MAX);
  };

  const addCondition = () =>
    setConditions((c) => [...c, { id: condId.current++, op: "AND", term: "" }]);
  const updateCondition = (id: number, patch: Partial<Condition>) =>
    setConditions((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeCondition = (id: number) =>
    setConditions((c) => c.filter((x) => x.id !== id));

  const toggleSaved = (id: string) =>
    setSaved((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onSuggest = (kw: string) => {
    setQuery(kw);
    runSearch(kw);
  };

  return (
    <main className="main search">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Tìm kiếm</h1>
          <p className="topbar__sub">
            Tra cứu bài báo theo từ khóa, tác giả, lĩnh vực · truy vấn nâng cao AND / OR / NOT
          </p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {/* Search bar */}
      <form
        className="searchbar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query.trim());
        }}
      >
        <div className="searchbar__scope seg" role="group" aria-label="Phạm vi tìm kiếm">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`seg__btn ${scope === s.id ? "is-active" : ""}`}
              aria-pressed={scope === s.id}
              onClick={() => setScope(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="searchbar__field">
          <IconSearch className="searchbar__icon" width={20} height={20} />
          <input
            type="search"
            className="searchbar__input"
            placeholder="Từ khóa, tiêu đề hoặc tên tác giả…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Từ khóa tìm kiếm"
          />
          {query && (
            <button
              type="button"
              className="searchbar__clear"
              onClick={() => setQuery("")}
              aria-label="Xóa từ khóa"
            >
              <IconX width={16} height={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn--primary searchbar__submit">
          Tìm kiếm
        </button>
      </form>

      {/* Advanced conditions */}
      <div className="advq">
        <div className="advq__chips">
          {conditions.map((c) => (
            <div className="condchip" key={c.id}>
              <select
                className="condchip__op"
                value={c.op}
                onChange={(e) => updateCondition(c.id, { op: e.target.value as CondOp })}
                aria-label="Toán tử điều kiện"
              >
                <option value="AND">VÀ</option>
                <option value="OR">HOẶC</option>
                <option value="NOT">KHÔNG</option>
              </select>
              <input
                className="condchip__term"
                value={c.term}
                placeholder="điều kiện…"
                onChange={(e) => updateCondition(c.id, { term: e.target.value })}
                aria-label="Cụm điều kiện"
              />
              <button
                type="button"
                className="condchip__x"
                onClick={() => removeCondition(c.id)}
                aria-label="Xóa điều kiện"
              >
                <IconX width={14} height={14} />
              </button>
            </div>
          ))}
          <button type="button" className="advq__add" onClick={addCondition}>
            <IconPlus width={15} height={15} /> Thêm điều kiện
          </button>
        </div>
      </div>

      {/* Related keyword suggestions */}
      <div className="related">
        <span className="related__label">Gợi ý:</span>
        {RELATED_KEYWORDS.map((k) => (
          <button key={k} type="button" className="kw" onClick={() => onSuggest(k)}>
            {k}
          </button>
        ))}
      </div>

      <div className="search-layout">
        {/* Facet sidebar */}
        <aside className={`facets ${facetsOpen ? "is-open" : ""}`} aria-label="Bộ lọc">
          <div className="facets__head">
            <span className="facets__title">
              <IconFilter width={17} height={17} /> Bộ lọc
            </span>
            {activeFilterCount > 0 && (
              <button type="button" className="facets__clear" onClick={clearFilters}>
                Xóa lọc ({activeFilterCount})
              </button>
            )}
          </div>

          <FacetGroup title="Lĩnh vực">
            {FIELDS.map((f) => (
              <Check
                key={f}
                label={f}
                checked={fields.has(f)}
                onChange={() => toggleSet(fields, f, setFields)}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Khoảng năm">
            <div className="yearrange">
              <label>
                <span>Từ</span>
                <select value={yearFrom} onChange={(e) => setYearFrom(Number(e.target.value))}>
                  {yearOptions(YEAR_MIN, yearTo)}
                </select>
              </label>
              <span className="yearrange__dash" aria-hidden>
                –
              </span>
              <label>
                <span>Đến</span>
                <select value={yearTo} onChange={(e) => setYearTo(Number(e.target.value))}>
                  {yearOptions(yearFrom, YEAR_MAX)}
                </select>
              </label>
            </div>
          </FacetGroup>

          <FacetGroup title="Nguồn dữ liệu">
            {SOURCES.map((s) => (
              <Check
                key={s}
                label={s}
                checked={sources.has(s)}
                onChange={() => toggleSet(sources, s, setSources)}
              />
            ))}
          </FacetGroup>

          <FacetGroup title="Loại tài liệu">
            {TYPES.map((t) => (
              <Check
                key={t}
                label={typeLabel(t)}
                checked={types.has(t)}
                onChange={() => toggleSet(types, t, setTypes)}
              />
            ))}
          </FacetGroup>
        </aside>

        {/* Results column */}
        <section className="results" aria-live="polite">
          <div className="results__bar">
            <button
              type="button"
              className="results__facettoggle"
              onClick={() => setFacetsOpen((o) => !o)}
            >
              <IconFilter width={16} height={16} /> Bộ lọc
              {activeFilterCount > 0 && <span className="results__badge num">{activeFilterCount}</span>}
            </button>

            <p className="results__count">
              {status === "results" ? (
                <>
                  <strong className="num">{formatInt(results.length)}</strong> kết quả
                  {submitted && (
                    <>
                      {" "}
                      cho “<span className="results__q">{submitted}</span>”
                    </>
                  )}
                </>
              ) : status === "landing" ? (
                "Nhập từ khóa để bắt đầu tìm kiếm"
              ) : (
                "\u00A0"
              )}
            </p>

            <label className="results__sort">
              <span className="results__sortlabel">Sắp xếp</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <IconChevron className="results__sorticon" width={16} height={16} />
            </label>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && status !== "landing" && (
            <div className="activefilters">
              {[...fields].map((f) => (
                <FilterPill key={`f-${f}`} label={f} onRemove={() => toggleSet(fields, f, setFields)} />
              ))}
              {[...sources].map((s) => (
                <FilterPill key={`s-${s}`} label={s} onRemove={() => toggleSet(sources, s, setSources)} />
              ))}
              {[...types].map((t) => (
                <FilterPill
                  key={`t-${t}`}
                  label={typeLabel(t as PaperResult["type"])}
                  onRemove={() => toggleSet(types, t, setTypes)}
                />
              ))}
              {(yearFrom !== YEAR_MIN || yearTo !== YEAR_MAX) && (
                <FilterPill
                  label={`${yearFrom}–${yearTo}`}
                  onRemove={() => {
                    setYearFrom(YEAR_MIN);
                    setYearTo(YEAR_MAX);
                  }}
                />
              )}
            </div>
          )}

          {status === "loading" && <ResultsSkeleton />}

          {status === "landing" && <LandingState onSuggest={onSuggest} onPickField={(f) => {
            toggleSet(fields, f, setFields);
            runSearch("");
          }} />}

          {status === "error" && (
            <div className="state state--error">
              <p className="state__title">Không tải được kết quả tìm kiếm</p>
              <p className="state__body">Có lỗi khi truy vấn nguồn dữ liệu. Vui lòng thử lại.</p>
              <button className="btn btn--primary" onClick={() => runSearch(submitted)}>
                Thử lại
              </button>
            </div>
          )}

          {status === "empty" && (
            <div className="state state--empty">
              <p className="state__title">Không tìm thấy bài báo phù hợp</p>
              <p className="state__body">
                Thử nới rộng khoảng năm, bỏ bớt bộ lọc, hoặc dùng từ khóa tổng quát hơn.
              </p>
              {activeFilterCount > 0 && (
                <button className="btn btn--ghost" onClick={clearFilters}>
                  Xóa {activeFilterCount} bộ lọc
                </button>
              )}
            </div>
          )}

          {status === "results" && (
            <>
              <ol className="resultlist">
                {pageItems.map((p) => (
                  <ResultItem
                    key={p.id}
                    paper={p}
                    terms={highlightTerms}
                    saved={saved.has(p.id)}
                    onToggleSave={() => toggleSaved(p.id)}
                  />
                ))}
              </ol>

              {totalPages > 1 && (
                <nav className="pager" aria-label="Phân trang kết quả">
                  <button
                    className="pager__btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <span className="pager__pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        className={`pager__page num ${n === page ? "is-active" : ""}`}
                        aria-current={n === page ? "page" : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </span>
                  <button
                    className="pager__btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sau
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* Demo state preview (parity with dashboard) */}
      <div className="statepick statepick--search" role="group" aria-label="Xem trước trạng thái (demo)">
        <span className="statepick__label">Xem trạng thái</span>
        {(["auto", "loading", "empty", "error"] as Demo[]).map((d) => (
          <button
            key={d}
            className={`statepick__btn ${demo === d ? "is-active" : ""}`}
            onClick={() => setDemo(d)}
          >
            {d === "auto" ? "Thực tế" : d === "loading" ? "Đang tải" : d === "empty" ? "Trống" : "Lỗi"}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ---------- sub-components ---------- */

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="facetgroup">
      <h3 className="facetgroup__title">{title}</h3>
      <div className="facetgroup__body">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`check ${checked ? "is-checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check__box" aria-hidden />
      <span className="check__label">{label}</span>
    </label>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="fpill">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Bỏ lọc ${label}`}>
        <IconX width={13} height={13} />
      </button>
    </span>
  );
}

function ResultItem({
  paper,
  terms,
  saved,
  onToggleSave,
}: {
  paper: PaperResult;
  terms: string[];
  saved: boolean;
  onToggleSave: () => void;
}) {
  const authors =
    paper.authors.length > 3
      ? `${paper.authors.slice(0, 3).join(", ")} +${paper.authors.length - 3}`
      : paper.authors.join(", ");

  return (
    <li className="rcard">
      <div className="rcard__main">
        <h3 className="rcard__title">
          <a href={paper.url} target="_blank" rel="noreferrer noopener">
            {highlight(paper.title, terms)}
          </a>
        </h3>
        <p className="rcard__meta">
          <span className="rcard__authors">{authors}</span>
          <span className="rcard__dot" aria-hidden>·</span>
          <span className="num">{paper.year}</span>
          <span className="rcard__dot" aria-hidden>·</span>
          <span className="rcard__source">{paper.source}</span>
          <span className={`rtype rtype--${paper.type.toLowerCase()}`}>{typeLabel(paper.type)}</span>
        </p>
        <p className="rcard__abstract">{highlight(paper.abstract, terms)}</p>
        <div className="rcard__kw">
          {paper.keywords.slice(0, 4).map((k) => (
            <span key={k} className="tag">
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="rcard__side">
        <span className="rcard__cites" title="Số lượt trích dẫn">
          <IconQuote width={15} height={15} />
          <strong className="num">{formatInt(paper.citations)}</strong>
          <span className="rcard__citelabel">trích dẫn</span>
        </span>
        <div className="rcard__actions">
          <button
            className={`iconpill ${saved ? "is-on" : ""}`}
            onClick={onToggleSave}
            aria-pressed={saved}
            title={saved ? "Bỏ khỏi thư viện" : "Lưu vào thư viện"}
          >
            <IconBookmark width={16} height={16} />
            {saved ? "Đã lưu" : "Lưu"}
          </button>
          <a
            className="iconpill"
            href={paper.url}
            target="_blank"
            rel="noreferrer noopener"
            title="Mở tại nguồn"
          >
            <IconExternal width={16} height={16} />
            Nguồn
          </a>
        </div>
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <ol className="resultlist" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li className="rcard rcard--skel" key={i}>
          <div className="rcard__main">
            <div className="skel" style={{ height: 20, width: "72%" }} />
            <div className="skel" style={{ height: 13, width: "40%", marginTop: 12 }} />
            <div className="skel" style={{ height: 12, width: "100%", marginTop: 14 }} />
            <div className="skel" style={{ height: 12, width: "88%", marginTop: 6 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function LandingState({
  onSuggest,
  onPickField,
}: {
  onSuggest: (kw: string) => void;
  onPickField: (f: string) => void;
}) {
  return (
    <div className="landing">
      <div className="landing__icon" aria-hidden>
        <IconSearch width={26} height={26} />
      </div>
      <p className="landing__title">Bắt đầu khám phá tài liệu nghiên cứu</p>
      <p className="landing__body">
        Nhập từ khóa, tên tác giả hoặc chọn nhanh một lĩnh vực bên dưới. Dùng điều kiện nâng cao
        (VÀ / HOẶC / KHÔNG) để thu hẹp truy vấn.
      </p>

      <div className="landing__block">
        <span className="landing__blocklabel">Từ khóa thịnh hành</span>
        <div className="landing__chips">
          {RELATED_KEYWORDS.map((k) => (
            <button key={k} className="kw kw--lg" onClick={() => onSuggest(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="landing__block">
        <span className="landing__blocklabel">Duyệt theo lĩnh vực</span>
        <div className="landing__fields">
          {FIELDS.map((f) => (
            <button key={f} className="fieldcard" onClick={() => onPickField(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function typeLabel(t: PaperResult["type"]) {
  return t === "Journal" ? "Tạp chí" : t === "Conference" ? "Hội nghị" : "Preprint";
}

function yearOptions(min: number, max: number) {
  const out: React.ReactNode[] = [];
  for (let y = YEAR_MAX; y >= YEAR_MIN; y--) {
    out.push(
      <option key={y} value={y} disabled={y < min || y > max}>
        {y}
      </option>,
    );
  }
  return out;
}

/** Wrap query-term matches in <mark>. Single capture group → odd split indices are matches. */
function highlight(text: string, terms: string[]) {
  const clean = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
  if (!clean.length) return text;
  const esc = clean.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark className="hl" key={i}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
