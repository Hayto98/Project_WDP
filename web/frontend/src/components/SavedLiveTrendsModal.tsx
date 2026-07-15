import { useEffect, useState } from "react";
import { analyticsApi } from "../lib/api";
import "./Modal.css";

interface SavedReport {
  id: string;
  topic: string;
  sources: string[];
  yearFrom: number;
  yearTo: number;
  generatedAt: string;
  result: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: any) => void;
}

export function SavedLiveTrendsModal({ isOpen, onClose, onSelect }: Props) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    setError("");
    analyticsApi.savedLiveTrends()
      .then((data) => {
        if (alive) setReports(data);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Lỗi tải lịch sử.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3 className="modal-title">Lịch sử Live Trends đã lưu</h3>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 16px' }}>
          {loading ? (
            <p>Đang tải...</p>
          ) : error ? (
            <p style={{ color: 'var(--c-err)' }}>{error}</p>
          ) : reports.length === 0 ? (
            <p>Chưa có phân tích Live Trends nào được lưu.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {reports.map((r) => (
                <li key={r.id} style={{ 
                  borderBottom: '1px solid var(--b-l3)', 
                  padding: '12px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--t-l1)' }}>
                      {r.topic}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--t-l2)' }}>
                      {r.sources.join(', ')} • {r.yearFrom}-{r.yearTo}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--t-l3)', marginTop: 4 }}>
                      Lưu lúc: {new Date(r.generatedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <button 
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      onSelect(r.result);
                      onClose();
                    }}
                  >
                    Xem lại
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer" style={{ marginTop: 16 }}>
          <button className="btn btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
