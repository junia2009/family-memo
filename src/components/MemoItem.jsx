import { getMemoImages } from '../imageUtils'
import './MemoItem.css'

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MemoItem({ memo, userName, onView, onEdit, onDelete, onTogglePin }) {
  const isFromPartner = memo.author && memo.author !== userName
  const isUnread = isFromPartner && !(memo.readBy || []).includes(userName)
  const isAya = memo.author === 'あや'
  const images = getMemoImages(memo)

  return (
    <div
      className={`memo-item${memo.pinned ? ' pinned' : ''}${isUnread ? ' unread' : ''}`}
      style={{ borderLeftColor: memo.color || 'transparent' }}
    >
      {isUnread && <span className="unread-dot" />}
      <div className="memo-content" onClick={() => onView(memo)}>
        <div className="memo-meta">
          {memo.author && (
            <span className={`author-badge ${isAya ? 'aya' : 'ryo'}`}>
              {isAya ? '👩' : '👨'} {memo.author}
            </span>
          )}
          {(memo.readBy || []).length >= 2 && (
            <span className="read-check" title="ふたりとも既読">✅</span>
          )}
        </div>
        {memo.title && <h3 className="memo-title">{memo.title}</h3>}
        {memo.content && <p className="memo-body">{memo.content}</p>}
        {images.length > 0 && (
          <div className={`memo-image-grid count-${Math.min(images.length, 3)}`}>
            {images.map((url, i) => (
              <div className="memo-image-wrap" key={url}>
                <img
                  src={url}
                  alt={`添付画像 ${i + 1}`}
                  className="memo-image"
                  onClick={(e) => { e.stopPropagation(); window.open(url, '_blank') }}
                />
              </div>
            ))}
          </div>
        )}
        <span className="memo-date">
          🕐 {formatDate(memo.updatedAt || memo.createdAt)}
        </span>
      </div>
      <div className="memo-actions">
        <button
          className={`action-btn pin-btn${memo.pinned ? ' active' : ''}`}
          onClick={() => onTogglePin(memo)}
          title={memo.pinned ? 'ピン解除' : 'ピン留め'}
        >
          📌
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(memo)}
          title="編集"
        >
          ✏️
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(memo.id)}
          title="削除"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
