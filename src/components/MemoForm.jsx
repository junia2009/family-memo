import { useState, useRef } from 'react'
import './MemoForm.css'
const COLOR_OPTIONS = [
  { value: null,      label: 'なし',     bg: '#e9ecef' },
  { value: '#ffb3c6', label: 'ピンク',   bg: '#ffb3c6' },
  { value: '#ff6b6b', label: 'レッド',   bg: '#ff6b6b' },
  { value: '#ffa94d', label: 'オレンジ', bg: '#ffa94d' },
  { value: '#69db7c', label: 'グリーン', bg: '#69db7c' },
  { value: '#74c0fc', label: 'ブルー',   bg: '#74c0fc' },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DIMENSION = 1280 // 最大幅・高さ (px)
const JPEG_QUALITY = 0.75 // 圧縮品質

const compressImage = (file) =>
  new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY)
    }
    img.src = url
  })

export default function MemoForm({ memo, onSave, onCancel }) {
  const [title, setTitle] = useState(memo?.title || '')
  const [content, setContent] = useState(memo?.content || '')
  const [pinned, setPinned] = useState(memo?.pinned || false)
  const [color, setColor] = useState(memo?.color || null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(memo?.imageUrl || null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('画像ファイルを選択してください')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('5MB以下の画像を選択してください')
      return
    }
    setImageError('')
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setImagePreview(URL.createObjectURL(compressed))
      setRemoveImage(false)
    } finally {
      setCompressing(false)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), content: content.trim(), pinned, color, imageFile, removeImage })
    } finally {
      setSaving(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-card"
      >
        <div className="modal-handle" />
        <div className="modal-inner">
          <div className="modal-header">
            <span className="modal-header-icon">{memo ? '✏️' : '📝'}</span>
            <h2>{memo ? 'メモを編集' : '新しいメモ'}</h2>
          </div>
          <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="タイトル（任意）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
          <textarea
            placeholder="内容を入力..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-textarea"
            rows={6}
            autoFocus={!memo}
          />
          <label className="pin-label">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            📌 ピン留めする
          </label>
          <div className="color-picker">
            <span className="color-picker-label">🎨 カラー</span>
            <div className="color-swatches">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value ?? 'none'}
                  type="button"
                  className={`color-swatch${color === opt.value ? ' selected' : ''}`}
                  style={{ background: opt.bg }}
                  onClick={() => setColor(opt.value)}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* 画像添付 */}
          <div className="image-picker">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="image-upload"
              className="image-input-hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="プレビュー" className="image-preview" />
                <button type="button" className="image-remove-btn" onClick={handleRemoveImage} title="画像を削除">
                  ✕
                </button>
              </div>
            ) : (
              <label htmlFor="image-upload" className={`image-upload-btn${compressing ? ' compressing' : ''}`}>
                {compressing ? (
                  <><span className="spinner-dark" /> 圧縮中...</>
                ) : (
                  <><span>📷</span><span>写真を追加</span></>
                )}
              </label>
            )}
            {imageError && <p className="image-error">{imageError}</p>}
          </div>
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving || compressing || (!title.trim() && !content.trim())}
            >
              {saving ? '💾 保存中...' : compressing ? '🗜️ 圧縮中...' : '💕 保存'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
