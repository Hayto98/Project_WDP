import { useEffect, useMemo, useState } from "react";
import { IconBookmark, IconExternal, IconLibrary, IconPlus, IconSearch, IconX } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { libraryApi } from "../lib/api";
import {
  COLLECTIONS,
  makeLibraryEntries,
  type LibraryCollection,
  type LibraryEntry,
  type ReadingStatus,
} from "../data/librarySample";

type StatusFilter = "all" | ReadingStatus;
type SortKey = "saved" | "year" | "citations" | "title";
type Demo = "auto" | "loading" | "empty" | "error";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "reading", label: "Đang đọc" },
  { id: "done", label: "Đã đọc" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "saved", label: "Mới lưu" },
  { id: "year", label: "Năm mới nhất" },
  { id: "citations", label: "Trích dẫn nhiều" },
  { id: "title", label: "Tiêu đề A-Z" },
];

const STATUS_LABEL: Record<ReadingStatus, string> = {
  unread: "Chưa đọc",
  reading: "Đang đọc",
  done: "Đã đọc",
};

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function LibraryPage({ theme, toggle }: Props) {
  const [items, setItems] = useState<LibraryEntry[]>(() => makeLibraryEntries());
  const [collections, setCollections] = useState<LibraryCollection[]>(COLLECTIONS);
  const [activeCollection, setActiveCollection] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("saved");
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [newCollection, setNewCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([libraryApi.collections(), libraryApi.papers()])
      .then(([nextCollections, nextItems]) => {
        if (!alive) return;
        if (nextCollections.length) setCollections(nextCollections);
        if (nextItems.length) {
          setItems(nextItems);
          setSelectedId(nextItems[0]?.id ?? null);
        }
      })
      .catch(() => {
        // Keep sample library data when the API is unavailable.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const c of collections) counts[c.id] = 0;
    for (const item of items) for (const c of item.collectionIds) counts[c] = (counts[c] ?? 0) + 1;
    return counts;
  }, [items, collections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((item) => {
      const paper = item.paper;
      const hay = [
        paper.title,
        paper.authors.join(" "),
        paper.source,
        paper.fields.join(" "),
        paper.keywords.join(" "),
        item.note,
      ]
        .join(" ")
        .toLowerCase();
      if (activeCollection !== "all" && !item.collectionIds.includes(activeCollection)) return false;
      if (status !== "all" && item.status !== status) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });

    rows.sort((a, b) => {
      if (sort === "year") return b.paper.year - a.paper.year || b.paper.citations - a.paper.citations;
      if (sort === "citations") return b.paper.citations - a.paper.citations;
      if (sort === "title") return a.paper.title.localeCompare(b.paper.title);
      return b.savedAt.localeCompare(a.savedAt);
    });
    return rows;
  }, [items, activeCollection, query, status, sort]);

  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const readCount = items.filter((i) => i.status === "done").length;
  const noteCount = items.filter((i) => i.note.trim()).length;
  const activeCollectionName =
    activeCollection === "all"
      ? "Tất cả bài đã lưu"
      : collections.find((c) => c.id === activeCollection)?.name ?? "Bộ sưu tập";

  const view: "loading" | "error" | "empty" | "ready" =
    demo === "loading" || loading
      ? "loading"
      : demo === "error"
        ? "error"
        : demo === "empty" || items.length === 0
          ? "empty"
          : "ready";

  const updateItem = (id: string, patch: Partial<LibraryEntry>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const addCollection = () => {
    const name = newCollection.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setCollections((current) => [...current, { id, name, description: "Bộ sưu tập do bạn tạo" }]);
    setNewCollection("");
    setActiveCollection(id);
  };

  return (
    <main className="main library">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Thư viện</h1>
          <p className="topbar__sub">
            Quản lý bài đã lưu, bộ sưu tập, ghi chú và tiến độ đọc
          </p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <div className="trendsum librarysum" aria-label="Tổng quan thư viện">
        <Summary label="Bài đã lưu" value={formatInt(items.length)} />
        <Summary label="Đã đọc" value={formatInt(readCount)} />
        <Summary label="Có ghi chú" value={formatInt(noteCount)} />
        <Summary label="Bộ sưu tập" value={formatInt(collections.length)} />
      </div>

      <div className="library-layout">
        <aside className="libside" aria-label="Bộ sưu tập">
          <div className="libside__head">
            <span className="libside__title">
              <IconLibrary width={17} height={17} /> Bộ sưu tập
            </span>
          </div>

          <button
            className={`libcol ${activeCollection === "all" ? "is-active" : ""}`}
            onClick={() => setActiveCollection("all")}
            aria-current={activeCollection === "all" ? "page" : undefined}
          >
            <span>
              <strong>Tất cả</strong>
              <small>Toàn bộ bài đã lưu</small>
            </span>
            <span className="libcol__count num">{collectionCounts.all ?? 0}</span>
          </button>

          <div className="libside__list">
            {collections.map((collection) => (
              <button
                key={collection.id}
                className={`libcol ${activeCollection === collection.id ? "is-active" : ""}`}
                onClick={() => setActiveCollection(collection.id)}
                aria-current={activeCollection === collection.id ? "page" : undefined}
              >
                <span>
                  <strong>{collection.name}</strong>
                  <small>{collection.description}</small>
                </span>
                <span className="libcol__count num">{collectionCounts[collection.id] ?? 0}</span>
              </button>
            ))}
          </div>

          <form
            className="libnew"
            onSubmit={(e) => {
              e.preventDefault();
              addCollection();
            }}
          >
            <label htmlFor="new-collection">Tạo bộ sưu tập</label>
            <div className="libnew__row">
              <input
                id="new-collection"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                placeholder="Ví dụ: Survey 2026"
              />
              <button type="submit" className="icon-btn" aria-label="Tạo bộ sưu tập">
                <IconPlus width={16} height={16} />
              </button>
            </div>
          </form>
        </aside>

        <section className="libmain" aria-live="polite">
          <div className="libtoolbar">
            <div className="libtoolbar__title">
              <h2>{activeCollectionName}</h2>
              <p>
                <span className="num">{formatInt(filtered.length)}</span> bài khớp bộ lọc
              </p>
            </div>

            <div className="libtoolbar__search">
              <IconSearch width={18} height={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề, tác giả, ghi chú…"
                aria-label="Tìm trong thư viện"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Xóa từ khóa">
                  <IconX width={14} height={14} />
                </button>
              )}
            </div>

            <div className="seg" role="group" aria-label="Lọc trạng thái đọc">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`seg__btn ${status === s.id ? "is-active" : ""}`}
                  aria-pressed={status === s.id}
                  onClick={() => setStatus(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <label className="libsort">
              <span>Sắp xếp</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {view === "loading" && <LibrarySkeleton />}

          {view === "error" && (
            <div className="state state--error">
              <p className="state__title">Không tải được thư viện</p>
              <p className="state__body">Có lỗi khi đọc danh sách bài đã lưu. Vui lòng thử lại.</p>
              <button className="btn btn--primary" onClick={() => setDemo("auto")}>
                Thử lại
              </button>
            </div>
          )}

          {view === "empty" && <LibraryEmpty onReset={() => setDemo("auto")} />}

          {view === "ready" && filtered.length === 0 && (
            <div className="state state--empty">
              <p className="state__title">Không có bài nào khớp bộ lọc</p>
              <p className="state__body">
                Thử xóa từ khóa, đổi trạng thái đọc hoặc chọn bộ sưu tập khác.
              </p>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setActiveCollection("all");
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {view === "ready" && filtered.length > 0 && (
            <ol className="librows">
              {filtered.map((entry) => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  collections={collections}
                  selected={selected?.id === entry.id}
                  onSelect={() => setSelectedId(entry.id)}
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="libdetail" aria-label="Chi tiết bài đã lưu">
          {view === "ready" && selected ? (
            <LibraryDetail
              entry={selected}
              collections={collections}
              onUpdate={(patch) => updateItem(selected.id, patch)}
              onRemove={() => removeItem(selected.id)}
            />
          ) : (
            <div className="libdetail__empty">
              <IconBookmark width={24} height={24} />
              <p>Chọn một bài trong danh sách để xem metadata, ghi chú và trạng thái đọc.</p>
            </div>
          )}
        </aside>
      </div>

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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sumstat">
      <span className="sumstat__label">{label}</span>
      <span className="sumstat__value num">{value}</span>
    </div>
  );
}

function LibraryRow({
  entry,
  collections,
  selected,
  onSelect,
}: {
  entry: LibraryEntry;
  collections: LibraryCollection[];
  selected: boolean;
  onSelect: () => void;
}) {
  const names = entry.collectionIds
    .map((id) => collections.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <li className={`librow ${selected ? "is-selected" : ""}`}>
      <button className="librow__button" onClick={onSelect} aria-pressed={selected}>
        <span className={`librow__status librow__status--${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
        <span className="librow__main">
          <span className="librow__title">{entry.paper.title}</span>
          <span className="librow__meta">
            {entry.paper.authors.slice(0, 3).join(", ")}
            {entry.paper.authors.length > 3 ? ` +${entry.paper.authors.length - 3}` : ""} ·{" "}
            <span className="num">{entry.paper.year}</span> · {entry.paper.source}
          </span>
          <span className="librow__note">{entry.note}</span>
        </span>
        <span className="librow__tags">
          {names.map((name) => (
            <span key={name} className="tag">
              {name}
            </span>
          ))}
        </span>
        <span className="librow__cites num">{formatInt(entry.paper.citations)} cites</span>
      </button>
    </li>
  );
}

function LibraryDetail({
  entry,
  collections,
  onUpdate,
  onRemove,
}: {
  entry: LibraryEntry;
  collections: LibraryCollection[];
  onUpdate: (patch: Partial<LibraryEntry>) => void;
  onRemove: () => void;
}) {
  const toggleCollection = (id: string) => {
    const next = new Set(entry.collectionIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onUpdate({ collectionIds: [...next] });
  };

  return (
    <div className="libdetail__body">
      <div className="libdetail__head">
        <span className={`librow__status librow__status--${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
        <p className="libdetail__saved num">Lưu {new Date(entry.savedAt).toLocaleDateString("vi-VN")}</p>
      </div>

      <h2>{entry.paper.title}</h2>
      <p className="libdetail__authors">{entry.paper.authors.join(", ")}</p>

      <div className="libdetail__meta">
        <span className="num">{entry.paper.year}</span>
        <span>{entry.paper.source}</span>
        <span>{entry.paper.type}</span>
        <span className="num">{formatInt(entry.paper.citations)} trích dẫn</span>
      </div>

      <div className="libdetail__section">
        <span className="libdetail__label">Trạng thái đọc</span>
        <div className="seg" role="group" aria-label="Cập nhật trạng thái đọc">
          {(["unread", "reading", "done"] as ReadingStatus[]).map((s) => (
            <button
              key={s}
              className={`seg__btn ${entry.status === s ? "is-active" : ""}`}
              aria-pressed={entry.status === s}
              onClick={() => onUpdate({ status: s })}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="libdetail__section">
        <span className="libdetail__label">Bộ sưu tập</span>
        <div className="libdetail__collections">
          {collections.map((c) => {
            const on = entry.collectionIds.includes(c.id);
            return (
              <button
                key={c.id}
                className={`libpick ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleCollection(c.id)}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="libdetail__section">
        <span className="libdetail__label">Ghi chú cá nhân</span>
        <textarea
          value={entry.note}
          onChange={(e) => onUpdate({ note: e.target.value })}
          rows={5}
          aria-label="Ghi chú cá nhân cho bài báo"
        />
      </label>

      <div className="libdetail__abstract">
        <span className="libdetail__label">Tóm tắt</span>
        <p>{entry.paper.abstract}</p>
      </div>

      <div className="libdetail__actions">
        <a className="btn btn--primary" href={entry.paper.url} target="_blank" rel="noreferrer noopener">
          <IconExternal width={16} height={16} /> Mở nguồn
        </a>
        <button className="btn btn--ghost" onClick={onRemove}>
          <IconX width={16} height={16} /> Bỏ lưu
        </button>
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <ol className="librows" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li className="librow librow--skel" key={i}>
          <div className="skel" style={{ height: 18, width: "68%" }} />
          <div className="skel" style={{ height: 12, width: "42%", marginTop: 10 }} />
          <div className="skel" style={{ height: 12, width: "88%", marginTop: 12 }} />
        </li>
      ))}
    </ol>
  );
}

function LibraryEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="state state--empty">
      <p className="state__title">Thư viện chưa có bài nào</p>
      <p className="state__body">
        Khi tìm thấy bài hữu ích ở trang Tìm kiếm, dùng nút “Lưu” để đưa bài vào thư viện và ghi chú sau.
      </p>
      <a className="btn btn--primary" href="#search" onClick={onReset}>
        Sang trang Tìm kiếm
      </a>
    </div>
  );
}
