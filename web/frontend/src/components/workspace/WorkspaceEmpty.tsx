export function WorkspaceEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="state state--empty">
      <p className="state__title">Chưa có workspace nhóm</p>
      <p className="state__body">
        Tạo workspace đầu tiên để chia sẻ thư viện, gắn paper vào task và phân công người phụ trách.
      </p>
      <button className="btn btn--primary" onClick={onReset}>
        Bắt đầu tạo workspace
      </button>
    </div>
  );
}
