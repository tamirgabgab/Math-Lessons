import type { Page } from "../storage/db";

export function PagesPanel({
  pages,
  current,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
}: {
  pages: Page[];
  current: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  return (
    <aside className="pages-panel" aria-label="עמודים">
      <div className="pages-list">
        {pages.map((page, i) => (
          <button
            key={page.id}
            className={`page-thumb ${i === current ? "active" : ""}`}
            onClick={() => onSelect(i)}
            title={`עמוד ${i + 1}`}
          >
            {page.thumbnail ? <img src={page.thumbnail} alt="" /> : <span className="page-empty" />}
            <span className="page-num">{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="pages-actions">
        <button className="btn primary small" onClick={onAdd} title="עמוד חדש אחרי העמוד הנוכחי">
          + עמוד
        </button>
        <div className="pages-actions-row">
          <button className="icon-btn" onClick={() => onMove(-1)} disabled={current === 0} title="הזז למעלה">▲</button>
          <button className="icon-btn" onClick={() => onMove(1)} disabled={current === pages.length - 1} title="הזז למטה">▼</button>
          <button className="icon-btn" onClick={onDuplicate} title="שכפל עמוד">⧉</button>
          <button className="icon-btn danger" onClick={onDelete} disabled={pages.length <= 1} title="מחק עמוד">🗑</button>
        </div>
      </div>
    </aside>
  );
}
