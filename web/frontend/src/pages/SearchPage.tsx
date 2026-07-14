import { useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "../hooks/useTheme";
import { ThemeToggle } from "../components/ThemeToggle";
import { formatInt } from "../lib/format";
import { aiApi, libraryApi, paperApi, searchApi } from "../lib/api";
import type { LibraryCollection } from "../data/librarySample";
import {
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

interface Condition {
  id: number;
  op: CondOp;
  term: string;
}

const YEAR_MIN = 1990;
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
const SYNCABLE_SOURCES = ["OpenAlex", "Semantic Scholar", "Crossref", "arXiv", "ACM Digital Library", "Exa"] as const;
/**
 * Default multi-source sync targets (no fragile/missing API keys).
 * Note: ACM has no public search API — the backend only approximates it via Crossref,
 * so it is omitted here to avoid duplicate Crossref pulls under a misleading label.
 */
const DEFAULT_SYNC_SOURCES = ["OpenAlex", "Crossref", "arXiv"] as const;

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function SearchPage({ theme, toggle }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [yearFrom, setYearFrom] = useState(YEAR_MIN);
  const [yearTo, setYearTo] = useState(YEAR_MAX);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<PaperResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [syncingRequest, setSyncingRequest] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [savingPaperId, setSavingPaperId] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const condId = useRef(1);
  const searchRunId = useRef(0);
  const autoSyncKeys = useRef(new Set<string>());

  const runSearch = (q: string, options: { resetPage?: boolean } = {}) => {
    setSubmitted(q);
    setHasSearched(true);
    if (options.resetPage ?? true) {
      setPage(1);
      // Allow auto-sync again for a fresh search submission.
      autoSyncKeys.current.clear();
    }
    setSearchNonce((value) => value + 1);
    setSearchError("");
  };

  const loadCollections = async () => {
    setCollectionsLoading(true);
    try {
      const rows = await libraryApi.collections();
      setCollections(rows);
      setSelectedCollectionId((current) => current || rows[0]?.id || "");
      return rows;
    } catch {
      setCollections([]);
      return [];
    } finally {
      setCollectionsLoading(false);
    }
  };

  useEffect(() => {
    void loadCollections();
  }, []);

  // Re-filter briefly when facets/sort change after an initial search.
  useEffect(() => {
    if (!hasSearched) return;
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, types, yearFrom, yearTo, conditions, sort]);

  const andTerms = useMemo(() => conditions.filter((c) => c.op === "AND" && c.term.trim()), [conditions]);
  const orTerms = useMemo(() => conditions.filter((c) => c.op === "OR" && c.term.trim()), [conditions]);
  const notTerms = useMemo(() => conditions.filter((c) => c.op === "NOT" && c.term.trim()), [conditions]);
  const andTermsParam = useMemo(() => andTerms.map((condition) => condition.term.trim()).join(","), [andTerms]);
  const orTermsParam = useMemo(() => orTerms.map((condition) => condition.term.trim()).join(","), [orTerms]);
  const notTermsParam = useMemo(() => notTerms.map((condition) => condition.term.trim()).join(","), [notTerms]);

  useEffect(() => {
    if (!hasSearched) return;
    const runId = ++searchRunId.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const isCurrent = () => searchRunId.current === runId;
    setLoading(true);
    setSearchError("");
    const sortParam = sort === "year" ? "year_desc" : sort === "citations" ? "citations" : "relevance";
    paperApi
      .search({
        q: submitted,
        scope,
        andTerms: andTermsParam,
        orTerms: orTermsParam,
        notTerms: notTermsParam,
        sources: [...sources].join(","),
        types: [...types].join(","),
        yearFrom,
        yearTo,
        sort: sortParam,
        page,
        limit: PAGE_SIZE,
      }, { signal: controller.signal })
      .then(({ papers, meta }) => {
        if (!isCurrent()) return;
        setRemoteResults(papers);
        setTotalResults(meta?.total ?? papers.length);
      })
      .catch((err) => {
        if (!isCurrent()) return;
        setRemoteResults([]);
        setTotalResults(0);
        setSearchError(
          err instanceof DOMException && err.name === "AbortError"
            ? "Tìm kiếm quá lâu. Vui lòng thử bỏ bớt bộ lọc hoặc thử lại sau."
            : err instanceof Error
              ? err.message
              : "Không thể tìm kiếm dữ liệu.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (isCurrent()) setLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [hasSearched, searchNonce, submitted, scope, andTermsParam, orTermsParam, notTermsParam, sources, types, yearFrom, yearTo, sort, page]);

  const queryTokens = useMemo(
    () => submitted.toLowerCase().split(/\s+/).filter(Boolean),
    [submitted],
  );
  const highlightTerms = useMemo(() => {
    const phrase = submitted.trim();
    const terms = [
      // Prefer full phrase highlight over individual tokens.
      ...(phrase.includes(" ") ? [phrase] : []),
      ...queryTokens,
      ...andTerms.map((c) => c.term),
      ...orTerms.map((c) => c.term),
    ]
      .map((term) => term.trim())
      .filter(Boolean);
    return [...new Set(terms)].sort((a, b) => b.length - a.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, conditions]);

  const results = remoteResults;

  const activeFilterCount =
    sources.size +
    types.size +
    (yearFrom !== YEAR_MIN || yearTo !== YEAR_MAX ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const pageItems = results;

  const status: "landing" | "loading" | "results" | "empty" | "error" =
    !hasSearched
      ? "landing"
      : loading
        ? "loading"
        : searchError
          ? "error"
          : results.length === 0
            ? "empty"
            : "results";
  // Sync checked syncable sources; otherwise pull from the default multi-source set.
  // If only non-syncable sources are filtered (e.g. IEEE), do not auto-sync.
  const syncTargets = useMemo(() => {
    const selected = SYNCABLE_SOURCES.filter((source) => sources.has(source));
    if (selected.length) return selected;
    if (sources.size === 0) return [...DEFAULT_SYNC_SOURCES];
    return [] as string[];
  }, [sources]);
  const canSyncSelectedSource =
    (status === "results" || status === "empty") &&
    Boolean((submitted.trim() || query.trim())) &&
    syncTargets.length > 0;
  const syncSourceLabel =
    syncTargets.length <= 1
      ? syncTargets[0] ?? "OpenAlex"
      : syncTargets.length <= 3
        ? syncTargets.join(", ")
        : `${syncTargets.length} nguồn`;
  const syncButtonLabel =
    syncTargets.length <= 1
      ? syncTargets[0] ?? "OpenAlex"
      : "nhiều nguồn";
  const paginationPages = useMemo(() => {
    const windowSize = 10;
    const start = Math.max(1, Math.min(page - 5, Math.max(1, totalPages - windowSize + 1)));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);
  const paginationWindowEnd = paginationPages[paginationPages.length - 1] ?? totalPages;

  const toggleSet = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    apply(next);
  };

  const clearFilters = () => {
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

  const ensureSaveCollection = async () => {
    if (selectedCollectionId) return selectedCollectionId;
    const currentCollections = collections.length ? collections : await loadCollections();
    if (currentCollections[0]?.id) {
      setSelectedCollectionId(currentCollections[0].id);
      return currentCollections[0].id;
    }
    const created = await libraryApi.createCollection("Đọc sau", "Bài lưu nhanh từ trang tìm kiếm");
    const id = String(created._id ?? created.id ?? "");
    const next = { id, name: created.collection_name ?? created.name ?? "Đọc sau", description: created.description ?? "" };
    setCollections([next]);
    setSelectedCollectionId(id);
    return id;
  };

  const savePaperToLibrary = async (paper: PaperResult) => {
    if (saved.has(paper.id) || savingPaperId) return;
    setSavingPaperId(paper.id);
    setSaveNotice("");
    try {
      const collectionId = await ensureSaveCollection();
      await libraryApi.savePaper(paper.id, [collectionId]);
      setSaved((current) => new Set(current).add(paper.id));
      const collectionName = collections.find((collection) => collection.id === collectionId)?.name ?? "thư viện";
      setSaveNotice(`Đã lưu “${paper.title}” vào ${collectionName}.`);
    } catch (err) {
      setSaveNotice(err instanceof Error ? err.message : "Không lưu được bài vào thư viện.");
    } finally {
      setSavingPaperId("");
    }
  };

  const saveCurrentSearch = async () => {
    const term = submitted.trim() || query.trim();
    if (!term || savingSearch) return;
    setSavingSearch(true);
    setSaveNotice("");
    try {
      await searchApi.createSavedSearch(`Tìm: ${term}`, {
        keywords: [term],
        year_gte: yearFrom,
        year_lte: yearTo,
        source_names: [...sources],
        logic: "AND",
      });
      setSaveNotice(`Đã lưu điều kiện tìm kiếm “${term}”.`);
    } catch (err) {
      setSaveNotice(err instanceof Error ? err.message : "Không lưu được điều kiện tìm kiếm.");
    } finally {
      setSavingSearch(false);
    }
  };

  const onSuggest = (kw: string) => {
    setQuery(kw);
    runSearch(kw);
  };

  const requestCorpusSync = async () => {
    const term = submitted.trim() || query.trim();
    if (!term || syncingRequest || syncTargets.length === 0) return;
    setSyncingRequest(true);
    setSyncNotice(`Đang tải bài báo từ ${syncSourceLabel}…`);
    try {
      const typesParam = [...types].join(",");
      const filters = {
        yearFrom,
        yearTo,
        ...(typesParam ? { types: typesParam } : {}),
      };
      // Fewer records per source when pulling several at once to keep latency reasonable.
      const maxRecords = syncTargets.length > 1 ? 25 : 50;
      const settled = await Promise.allSettled(
        syncTargets.map((sourceName) => paperApi.requestSync(term, sourceName, maxRecords, filters)),
      );

      let importedTotal = 0;
      let skippedTotal = 0;
      const parts = settled.map((result, index) => {
        const sourceName = syncTargets[index];
        if (result.status === "fulfilled") {
          const imported = result.value.result?.imported ?? result.value.records_processed ?? 0;
          const skipped = result.value.result?.skipped ?? 0;
          importedTotal += imported;
          skippedTotal += skipped;
          return `${sourceName}: +${formatInt(imported)}`;
        }
        const reason =
          result.reason instanceof Error ? result.reason.message : "không tải được";
        return `${sourceName}: lỗi (${reason})`;
      });

      setSyncNotice(
        `Đã tải thêm (${formatInt(importedTotal)} mới, bỏ qua ${formatInt(skippedTotal)} trùng) — ${parts.join(" · ")}`,
      );
      runSearch(term, { resetPage: false });
    } catch (err) {
      setSyncNotice(err instanceof Error ? err.message : "Không gửi được yêu cầu đồng bộ.");
    } finally {
      setSyncingRequest(false);
    }
  };

  useEffect(() => {
    if (!canSyncSelectedSource || syncingRequest || syncTargets.length === 0) return;
    const shouldLoadMore =
      status === "empty" || (status === "results" && page + 1 >= paginationWindowEnd);
    if (!shouldLoadMore) return;

    const term = submitted.trim() || query.trim();
    const key = [
      syncTargets.join(","),
      term,
      page,
      totalPages,
      yearFrom,
      yearTo,
      [...types].join(","),
      status,
    ].join("|");

    if (autoSyncKeys.current.has(key)) return;
    autoSyncKeys.current.add(key);
    void requestCorpusSync();
    // requestCorpusSync intentionally stays out to avoid recreating the auto-load trigger on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSyncSelectedSource, syncingRequest, status, page, totalPages, paginationWindowEnd, syncTargets, submitted, query, yearFrom, yearTo, types]);

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
                  <strong className="num">{formatInt(totalResults)}</strong> kết quả
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
            {status === "results" && submitted && (
              <>
                <label className="results__collection">
                  <span>Lưu vào</span>
                  <select
                    value={selectedCollectionId}
                    onChange={(event) => setSelectedCollectionId(event.target.value)}
                    disabled={collectionsLoading}
                    aria-label="Chọn bộ sưu tập để lưu paper"
                  >
                    {collections.length === 0 ? (
                      <option value="">Đọc sau</option>
                    ) : (
                      collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <button className="btn btn--ghost results__save" type="button" onClick={saveCurrentSearch} disabled={savingSearch}>
                  <IconBookmark width={15} height={15} />
                  {savingSearch ? "Đang lưu" : "Lưu tìm kiếm"}
                </button>
              </>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && status !== "landing" && (
            <div className="activefilters">
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
          {syncNotice && status !== "empty" && <p className="state__body" role="status">{syncNotice}</p>}
          {saveNotice && <p className="state__body" role="status">{saveNotice}</p>}

          {status === "loading" && <ResultsSkeleton />}

          {status === "landing" && <LandingState onSuggest={onSuggest} />}

          {status === "error" && (
            <div className="state state--error">
              <p className="state__title">Không tải được kết quả tìm kiếm</p>
              <p className="state__body">{searchError || "Có lỗi khi truy vấn nguồn dữ liệu. Vui lòng thử lại."}</p>
              <button className="btn btn--primary" onClick={() => runSearch(submitted)}>
                Thử lại
              </button>
            </div>
          )}

          {status === "empty" && (
            <div className="state state--empty">
              <p className="state__title">Không tìm thấy bài báo phù hợp</p>
              <p className="state__body">
                {syncingRequest
                  ? `Đang gọi ${syncSourceLabel} để tải bài báo vào corpus…`
                  : syncTargets.length
                    ? `Corpus hiện chưa có paper khớp. Hệ thống sẽ tự tải từ ${syncSourceLabel}, hoặc bạn có thể bấm nút bên dưới.`
                    : "Corpus hiện chưa có paper khớp. Bỏ lọc nguồn không hỗ trợ đồng bộ (ví dụ IEEE) hoặc chọn OpenAlex / Crossref / arXiv để tải thêm."}
              </p>
              <div className="state__actions">
                {syncTargets.length > 0 && (
                  <button
                    className="btn btn--primary"
                    type="button"
                    disabled={syncingRequest || !(submitted.trim() || query.trim())}
                    onClick={() => {
                      autoSyncKeys.current.clear();
                      void requestCorpusSync();
                    }}
                  >
                    {syncingRequest ? "Đang tải…" : `Tải từ ${syncButtonLabel}`}
                  </button>
                )}
                {activeFilterCount > 0 && (
                  <button className="btn btn--ghost" onClick={clearFilters}>
                    Xóa {activeFilterCount} bộ lọc
                  </button>
                )}
              </div>
              {syncNotice && <p className="state__body" role="status">{syncNotice}</p>}
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
                    saving={savingPaperId === p.id}
                    expanded={expandedId === p.id}
                    onToggleSave={() => savePaperToLibrary(p)}
                    onToggleExpand={() => setExpandedId((current) => (current === p.id ? "" : p.id))}
                    onOpenSource={() => paperApi.recordView(p.id).catch(() => undefined)}
                  />
                ))}
              </ol>

              {syncTargets.length > 0 && (
                <div className="state__actions" style={{ marginTop: "1rem" }}>
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={syncingRequest || !(submitted.trim() || query.trim())}
                    onClick={() => {
                      autoSyncKeys.current.clear();
                      void requestCorpusSync();
                    }}
                  >
                    {syncingRequest ? "Đang tải thêm…" : `Tải thêm từ ${syncButtonLabel}`}
                  </button>
                </div>
              )}

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
                    {paginationPages.map((n) => (
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
  saving,
  expanded,
  onToggleSave,
  onToggleExpand,
  onOpenSource,
}: {
  paper: PaperResult;
  terms: string[];
  saved: boolean;
  saving: boolean;
  expanded: boolean;
  onToggleSave: () => void;
  onToggleExpand: () => void;
  onOpenSource: () => void;
}) {
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedPapers, setRelatedPapers] = useState<PaperResult[]>([]);
  const authors =
    paper.authors.length > 3
      ? `${paper.authors.slice(0, 3).join(", ")} +${paper.authors.length - 3}`
      : paper.authors.join(", ");
  const doiHref = paper.doi ? `https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : paper.url;
  const doiLabel = paper.doi ? paper.doi.replace(/^https?:\/\/doi\.org\//i, "") : paper.url;
  const summarize = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const result = await aiApi.summarize({
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        source: paper.source,
        keywords: paper.keywords,
      });
      setAiSummary(result.summary);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không tóm tắt được paper.");
    } finally {
      setAiLoading(false);
    }
  };

  const loadRelated = async () => {
    setRelatedLoading(true);
    setAiError("");
    try {
      const results = await aiApi.relatedPapers({
        paperId: paper.id,
        title: paper.title,
        keywords: paper.keywords,
        fields: paper.fields,
        limit: 4,
      });
      setRelatedPapers(results);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không lấy được paper liên quan.");
    } finally {
      setRelatedLoading(false);
    }
  };

  return (
    <li className="rcard">
      <div className="rcard__main">
        <h3 className="rcard__title">
          <a href={paper.url} target="_blank" rel="noreferrer noopener" onClick={onOpenSource}>
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
        {doiLabel && doiLabel !== "#" && (
          <p className="rcard__doi">
            DOI/Link:{" "}
            <a href={doiHref} target="_blank" rel="noreferrer noopener" onClick={onOpenSource}>
              {doiLabel}
            </a>
          </p>
        )}
        <p className="rcard__abstract">
          {paper.abstract
            ? highlight(paper.abstract, terms)
            : `Không tìm được abstract nguyên văn từ ${paper.source} cho paper này.`}
        </p>
        <div className="rcard__kw">
          {paper.keywords.slice(0, 4).map((k) => (
            <span key={k} className="tag">
              {k}
            </span>
          ))}
        </div>
        {expanded && (
          <div className="rcard__detail">
            <span className="rcard__detail-label">Chi tiết paper</span>
            <dl>
              <div>
                <dt>Lĩnh vực</dt>
                <dd>{paper.fields.join(", ") || "Chưa phân loại"}</dd>
              </div>
              <div>
                <dt>Từ khóa</dt>
                <dd>{paper.keywords.join(", ") || "Chưa có từ khóa"}</dd>
              </div>
              <div>
                <dt>Liên kết</dt>
                <dd>
                  <a href={paper.url} target="_blank" rel="noreferrer noopener" onClick={onOpenSource}>
                    {paper.url}
                  </a>
                </dd>
              </div>
            </dl>
            <div className="rcard__detail-actions">
              <button className="btn btn--ghost btn--sm" type="button" onClick={summarize} disabled={aiLoading}>
                {aiLoading ? "Đang tóm tắt..." : "AI tóm tắt"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={loadRelated} disabled={relatedLoading}>
                {relatedLoading ? "Đang tìm..." : "Paper liên quan"}
              </button>
            </div>
            {aiError && <p className="state__body">{aiError}</p>}
            {aiSummary && <p className="rcard__abstract">{aiSummary}</p>}
            {relatedPapers.length > 0 && (
              <div className="rcard__related">
                {relatedPapers.map((related) => (
                  <a key={related.id} href={related.url || "#"} target="_blank" rel="noreferrer noopener">
                    <span>{related.title}</span>
                    <small>{related.year} · {related.source}</small>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
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
            disabled={saved || saving}
            aria-pressed={saved}
            title={saved ? "Bỏ khỏi thư viện" : "Lưu vào thư viện"}
          >
            <IconBookmark width={16} height={16} />
            {saving ? "Đang lưu" : saved ? "Đã lưu" : "Lưu"}
          </button>
          <button className="iconpill" type="button" onClick={onToggleExpand} aria-expanded={expanded}>
            <IconSearch width={16} height={16} />
            {expanded ? "Thu gọn" : "Chi tiết"}
          </button>
          <a
            className="iconpill"
            href={paper.url}
            target="_blank"
            rel="noreferrer noopener"
            title="Mở tại nguồn"
            onClick={onOpenSource}
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
}: {
  onSuggest: (kw: string) => void;
}) {
  return (
    <div className="landing">
      <div className="landing__icon" aria-hidden>
        <IconSearch width={26} height={26} />
      </div>
      <p className="landing__title">Bắt đầu khám phá tài liệu nghiên cứu</p>
      <p className="landing__body">
        Nhập từ khóa hoặc tên tác giả. Dùng điều kiện nâng cao (VÀ / HOẶC / KHÔNG) để thu hẹp truy vấn.
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
