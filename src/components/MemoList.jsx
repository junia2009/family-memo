import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import MemoForm from './MemoForm'
import MemoItem from './MemoItem'
import MemoDetail from './MemoDetail'
import './MemoList.css'

const getDeviceId = () => {
  let id = localStorage.getItem('memo_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('memo_device_id', id)
  }
  return id
}

const DEVICE_ID = getDeviceId()

// カラーフィルターの選択肢（MemoForm の COLOR_OPTIONS と対応）
const FILTER_COLORS = [
  { key: 'none',    value: null,      label: 'なし',     bg: '#e9ecef' },
  { key: '#ffb3c6', value: '#ffb3c6', label: 'ピンク',   bg: '#ffb3c6' },
  { key: '#ff6b6b', value: '#ff6b6b', label: 'レッド',   bg: '#ff6b6b' },
  { key: '#ffa94d', value: '#ffa94d', label: 'オレンジ', bg: '#ffa94d' },
  { key: '#69db7c', value: '#69db7c', label: 'グリーン', bg: '#69db7c' },
  { key: '#74c0fc', value: '#74c0fc', label: 'ブルー',   bg: '#74c0fc' },
]

const colorKey = (color) => color || 'none'

// カラー別ソート時の色の並び順（FILTER_COLORS の順番）
const COLOR_ORDER = FILTER_COLORS.reduce((acc, c, i) => {
  acc[c.key] = i
  return acc
}, {})

// Firestore Timestamp / 各種値をミリ秒に変換（保存直後で未確定なら最新扱い）
const getTime = (ts) => {
  if (!ts) return Number.MAX_SAFE_INTEGER
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  const t = new Date(ts).getTime()
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t
}

export default function MemoList({ userName, onLogout }) {
  const [memos, setMemos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingMemo, setEditingMemo] = useState(null)
  const [viewingMemo, setViewingMemo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenColors, setHiddenColors] = useState(() => new Set())
  const [sortMode, setSortMode] = useState('created') // 'created' | 'color'
  const [createdDir, setCreatedDir] = useState('desc') // 'desc'(新しい順) | 'asc'(古い順)
  const isInitialLoad = useRef(true)

  const toggleColorFilter = (key) => {
    setHiddenColors((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const resetColorFilter = () => setHiddenColors(new Set())

  // 作成順ボタン: 未選択なら選択、選択中なら方向をトグル
  const handleSortCreated = () => {
    if (sortMode === 'created') {
      setCreatedDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortMode('created')
    }
  }

  const handleSortColor = () => setSortMode('color')

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const showNotification = useCallback((memo) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`💑 ${memo.author || '相手'}がメモを追加【家族めも】`, {
        body: memo.title || memo.content || '新しいメモ',
        tag: 'new-memo',
      })
    }
  }, [])

  // Firestore リアルタイム購読 + 既読処理
  useEffect(() => {
    const q = query(collection(db, 'memos'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isInitialLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data()
            if (data.deviceId && data.deviceId !== DEVICE_ID) {
              showNotification(data)
            }
          }
        })
      } else {
        isInitialLoad.current = false
      }

      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setMemos(docs)
      setLoading(false)

      // 相手が書いたメモで未読のものを既読にする
      docs.forEach((memo) => {
        if (
          memo.author &&
          memo.author !== userName &&
          !(memo.readBy || []).includes(userName)
        ) {
          updateDoc(doc(db, 'memos', memo.id), {
            readBy: arrayUnion(userName),
          })
        }
      })
    })
    return () => unsubscribe()
  }, [userName, showNotification])

  const uploadImage = async (memoId, imageFile) => {
    const storageRef = ref(storage, `memos/${memoId}/image`)
    await uploadBytes(storageRef, imageFile)
    return getDownloadURL(storageRef)
  }

  const handleAddMemo = async ({ title, content, pinned, color, imageFile }) => {
    const docRef = await addDoc(collection(db, 'memos'), {
      title,
      content,
      pinned: pinned || false,
      color: color || null,
      imageUrl: null,
      author: userName,
      deviceId: DEVICE_ID,
      readBy: [userName],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    if (imageFile) {
      const url = await uploadImage(docRef.id, imageFile)
      await updateDoc(docRef, { imageUrl: url })
    }
    setShowForm(false)
  }

  const handleUpdateMemo = async ({ title, content, pinned, color, imageFile, removeImage }) => {
    const memoRef = doc(db, 'memos', editingMemo.id)
    const updateData = {
      title,
      content,
      pinned,
      color: color || null,
      updatedAt: serverTimestamp(),
    }
    if (removeImage) {
      try { await deleteObject(ref(storage, `memos/${editingMemo.id}/image`)) } catch {}
      updateData.imageUrl = null
    } else if (imageFile) {
      updateData.imageUrl = await uploadImage(editingMemo.id, imageFile)
    }
    await updateDoc(memoRef, updateData)
    setEditingMemo(null)
    setShowForm(false)
  }

  const handleDeleteMemo = async (id) => {
    if (!window.confirm('このメモを削除しますか？')) return
    const memo = memos.find((m) => m.id === id)
    if (memo?.imageUrl) {
      try { await deleteObject(ref(storage, `memos/${id}/image`)) } catch {}
    }
    await deleteDoc(doc(db, 'memos', id))
  }

  const handleEditMemo = (memo) => {
    setEditingMemo(memo)
    setShowForm(true)
  }

  const handleViewMemo = (memo) => {
    setViewingMemo(memo)
  }

  const handleTogglePin = async (memo) => {
    await updateDoc(doc(db, 'memos', memo.id), {
      pinned: !memo.pinned,
      updatedAt: serverTimestamp(),
    })
  }

  const searchFiltered = searchQuery.trim()
    ? memos.filter(
        (m) =>
          (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : memos

  const colorFiltered =
    hiddenColors.size > 0
      ? searchFiltered.filter((m) => !hiddenColors.has(colorKey(m.color)))
      : searchFiltered

  const filteredMemos = [...colorFiltered].sort((a, b) => {
    if (sortMode === 'color') {
      const oa = COLOR_ORDER[colorKey(a.color)] ?? 999
      const ob = COLOR_ORDER[colorKey(b.color)] ?? 999
      if (oa !== ob) return oa - ob
      return getTime(b.createdAt) - getTime(a.createdAt) // 同色内は新しい順
    }
    const diff = getTime(a.createdAt) - getTime(b.createdAt)
    return createdDir === 'desc' ? -diff : diff
  })

  const pinnedMemos = filteredMemos.filter((m) => m.pinned)
  const unpinnedMemos = filteredMemos.filter((m) => !m.pinned)
  const unreadCount = memos.filter(
    (m) => m.author !== userName && !(m.readBy || []).includes(userName)
  ).length

  const partnerName = userName === 'あや' ? 'りょう' : 'あや'

  return (
    <div className="memo-app">
      {/* 背景浮遊キラキラ */}
      {['✨','💫','⭐','🌟','🏰','✨','💫','⭐','💥','🌟','✨','🏰','💫','⭐','✨','🌟','💥','⭐','✨','💫'].map((s, i) => (
        <span
          key={i}
          className={`bg-sparkle bg-sparkle-${i % 3}`}
          style={{
            left: `${(i * 5 + 2) % 96}%`,
            bottom: `-${8 + (i % 6) * 3}%`,
            fontSize: `${0.9 + (i % 5) * 0.35}rem`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${6 + (i % 5) * 1.5}s`,
          }}
        >{s}</span>
      ))}

      <header className="memo-header">
        <div className="header-content">
          <span className="header-icon">💑</span>
          <div className="header-titles">
            <h1>家族めも</h1>
            <p className="header-username">
              <span className="header-you">{userName}</span>
              <span className="header-sep"> と </span>
              <span className="header-partner">{partnerName}</span>
            </p>
          </div>
        </div>
        <div className="header-right">
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
          {memos.length > 0 && (
            <span className="memo-count-badge">{memos.length} 件</span>
          )}
          <button onClick={onLogout} className="logout-btn" title="ログアウト">
            ログアウト
          </button>
          <span className="header-version">v1.9.0</span>
        </div>
      </header>

      <main className={`memo-main${(showForm || !!viewingMemo) ? ' scroll-locked' : ''}`}>
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="タイトル・内容を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="color-filter-bar">
          <span className="color-filter-label">🎨 色で絞り込み</span>
          <div className="color-filter-swatches">
            {FILTER_COLORS.map((opt) => {
              const active = !hiddenColors.has(opt.key)
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`color-filter-swatch${active ? ' active' : ''}`}
                  style={{ background: opt.bg }}
                  onClick={() => toggleColorFilter(opt.key)}
                  title={`${opt.label}を${active ? '非表示にする' : '表示する'}`}
                  aria-pressed={active}
                />
              )
            })}
          </div>
          {hiddenColors.size > 0 && (
            <button className="color-filter-reset" onClick={resetColorFilter}>
              すべて表示
            </button>
          )}
        </div>

        <div className="sort-bar">
          <span className="sort-label">↕️ 並び替え</span>
          <div className="sort-options">
            <button
              type="button"
              className={`sort-btn${sortMode === 'created' ? ' active' : ''}`}
              onClick={handleSortCreated}
              title="作成順（タップで新しい順／古い順を切替）"
            >
              🕐 作成順
              {sortMode === 'created' && (
                <span className="sort-dir">
                  {createdDir === 'desc' ? '新しい順 ↓' : '古い順 ↑'}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`sort-btn${sortMode === 'color' ? ' active' : ''}`}
              onClick={handleSortColor}
              title="カラー別に並べる"
            >
              🎨 カラー別
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">読み込み中...</div>
        ) : filteredMemos.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <span className="empty-emoji">🔍</span>
                <p className="empty-title">「{searchQuery}」は見つかりませんでした</p>
              </>
            ) : hiddenColors.size > 0 && memos.length > 0 ? (
              <>
                <span className="empty-emoji">🎨</span>
                <p className="empty-title">表示中の色に一致するメモがありません</p>
                <button className="color-filter-reset" onClick={resetColorFilter}>
                  すべて表示
                </button>
              </>
            ) : (
              <>
                {/* 浮遊するキラキラ */}
                {['✨','🌟','💫','⭐','✨','💫','🌟','✨'].map((s, i) => (
                  <span
                    key={i}
                    className="empty-sparkle"
                    style={{
                      left: `${10 + i * 11}%`,
                      animationDelay: `${i * 0.6}s`,
                      animationDuration: `${3.5 + (i % 3)}s`,
                      fontSize: `${0.8 + (i % 3) * 0.3}rem`,
                    }}
                  >{s}</span>
                ))}
                <div className="empty-icon-wrap">
                  <span className="empty-emoji empty-emoji-pulse">🏰</span>
                  <span className="empty-icon-ring" />
                  <span className="empty-icon-ring empty-icon-ring2" />
                </div>
                <p className="empty-title empty-fade-in" style={{ animationDelay: '0.2s' }}>まだメモがありません</p>
                <p className="empty-sub empty-fade-in" style={{ animationDelay: '0.5s' }}>下のボタンから<br />ふたりのメモを追加しましょう！</p>
              </>
            )}
          </div>
        ) : (
          <>
            {pinnedMemos.length > 0 && (
              <section>
                <h2 className="section-label">📌 ピン留め</h2>
                {pinnedMemos.map((memo) => (
                  <MemoItem
                    key={memo.id}
                    memo={memo}
                    userName={userName}
                    onView={handleViewMemo}
                    onEdit={handleEditMemo}
                    onDelete={handleDeleteMemo}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </section>
            )}
            {unpinnedMemos.length > 0 && (
              <section>
                {pinnedMemos.length > 0 && (
                  <h2 className="section-label">📝 メモ一覧</h2>
                )}
                {unpinnedMemos.map((memo) => (
                  <MemoItem
                    key={memo.id}
                    memo={memo}
                    userName={userName}
                    onView={handleViewMemo}
                    onEdit={handleEditMemo}
                    onDelete={handleDeleteMemo}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <button
        className="fab fab-pulse"
        onClick={() => {
          setEditingMemo(null)
          setShowForm(true)
        }}
        title="メモを追加"
      >
        <span>メモを追加</span>
      </button>

      {viewingMemo && (
        <MemoDetail
          memo={viewingMemo}
          onClose={() => setViewingMemo(null)}
          onEdit={() => {
            const memo = viewingMemo
            setViewingMemo(null)
            setEditingMemo(memo)
            setShowForm(true)
          }}
        />
      )}

      {showForm && (
        <MemoForm
          memo={editingMemo}
          onSave={editingMemo ? handleUpdateMemo : handleAddMemo}
          onCancel={() => {
            setShowForm(false)
            setEditingMemo(null)
          }}
        />
      )}
    </div>
  )
}
