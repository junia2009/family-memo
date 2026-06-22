import { getMemoImages } from '../imageUtils'
import './MemoForm.css'
import './MemoDetail.css'

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MemoDetail({ memo, onClose, onEdit }) {
  const isAya = memo.author === 'あや'
  const images = getMemoImages(memo)

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card">
        <div className="modal-handle" />
        <div className="modal-inner">
          <div className="modal-header">
            <span className="modal-header-icon">📖</span>
            <h2>メモを見る</h2>
          </div>

          {/* 著者・ステータス行 */}
          <div className="detail-meta-row">
            {memo.author && (
              <span className={`author-badge ${isAya ? 'aya' : 'ryo'}`}>
                {isAya ? '👩' : '👨'} {memo.author}
              </span>
            )}
            {memo.pinned && <span className="detail-pin-badge">📌 ピン留め</span>}
            {(memo.readBy || []).length >= 2 && (
              <span className="read-check">✅ 既読</span>
            )}
          </div>

          {/* カラーバー */}
          {memo.color && (
            <div className="detail-color-bar" style={{ background: memo.color }} />
          )}

          {/* タイトル */}
          {memo.title && <h3 className="detail-title">{memo.title}</h3>}

          {/* 本文 */}
          {memo.content && <p className="detail-body">{memo.content}</p>}

          {/* 画像（複数可） */}
          {images.length > 0 && (
            <div className="detail-image-list">
              {images.map((url, i) => (
                <div className="detail-image-wrap" key={url}>
                  <img
                    src={url}
                    alt={`添付画像 ${i + 1}`}
                    className="detail-image"
                    onClick={() => window.open(url, '_blank')}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 日時 */}
          <p className="detail-date">🕐 {formatDate(memo.updatedAt || memo.createdAt)}</p>

          {/* ボタン */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              閉じる
            </button>
            <button type="button" className="btn-save" onClick={onEdit}>
              ✏️ 編集する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
