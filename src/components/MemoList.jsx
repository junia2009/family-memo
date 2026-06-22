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
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { db, storage } from '../firebase'
import { getMemoImages } from '../imageUtils'
import MemoForm from './MemoForm'
import MemoItem from './MemoItem'
import MemoDetail from './MemoDetail'
import './MemoList.css'

// 長押しドラッグで並べ替え可能なメモ項目のラッパー
function SortableMemoItem({ memo, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: memo.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  }
  return (
    <div ref={setNodeRef} style={style} className="sortable-memo" {...attributes} {...listeners}>
      <MemoItem memo={memo} {...props} />
    </div>
  )
}

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
  const [sortMode, setSortMode] = useState('created') // 'created' | 'color' | 'manual'
  const [createdDir, setCreatedDir] = useState('desc') // 'desc'(新しい順) | 'asc'(古い順)
  const isInitialLoad = useRef(true)

  // 長押し（200ms）でドラッグ開始。通常のタップ・スクロールは妨げない
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const toggleColorFilter = (key) => {
    setHiddenColors((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const resetColorFilter = () => setHiddenColors(new Set())

  // 全色を非表示にする（すべてのカラーフィルターを解除）
  const hideAllColors = () => setHiddenColors(new Set(FILTER_COLORS.map((c) => c.key)))

  const allHidden = hiddenColors.size === FILTER_COLORS.length

  // 作成順ボタン: 未選択なら選択、選択中なら方向をトグル
  const handleSortCreated = () => {
    if (sortMode === 'created') {
      setCreatedDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortMode('created')
    }
  }

  const handleSortColor = () => setSortMode('color')

  const handleSortManual = () => setSortMode('manual')

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

  // 1枚アップロードして公開URLを返す（一意パスに保存）
  const uploadImage = async (memoId, imageFile) => {
    const storageRef = ref(storage, `memos/${memoId}/images/${crypto.randomUUID()}`)
    await uploadBytes(storageRef, imageFile)
    return getDownloadURL(storageRef)
  }

  // ダウンロードURLからStorage上のオブジェクトを削除
  const deleteImageByUrl = async (url) => {
    try { await deleteObject(ref(storage, url)) } catch {}
  }

  const handleAddMemo = async ({ title, content, pinned, color, newFiles = [] }) => {
    const docRef = await addDoc(collection(db, 'memos'), {
      title,
      content,
      pinned: pinned || false,
      color: color || null,
      imageUrls: [],
      author: userName,
      deviceId: DEVICE_ID,
      readBy: [userName],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    if (newFiles.length > 0) {
      const urls = []
      for (const file of newFiles) {
        urls.push(await uploadImage(docRef.id, file))
      }
      await updateDoc(docRef, { imageUrls: urls })
    }
    setShowForm(false)
  }

  const handleUpdateMemo = async ({ title, content, pinned, color, existingUrls = [], newFiles = [] }) => {
    const memoRef = doc(db, 'memos', editingMemo.id)
    // フォームで削除された既存画像をStorageから消す
    const removedUrls = getMemoImages(editingMemo).filter((u) => !existingUrls.includes(u))
    await Promise.all(removedUrls.map(deleteImageByUrl))
    // 新規画像をアップロード
    const newUrls = []
    for (const file of newFiles) {
      newUrls.push(await uploadImage(editingMemo.id, file))
    }
    await updateDoc(memoRef, {
      title,
      content,
      pinned,
      color: color || null,
      imageUrls: [...existingUrls, ...newUrls],
      imageUrl: null, // 旧形式フィールドはクリア
      updatedAt: serverTimestamp(),
    })
    setEditingMemo(null)
    setShowForm(false)
  }

  const handleDeleteMemo = async (id) => {
    if (!window.confirm('このメモを削除しますか？')) return
    const memo = memos.find((m) => m.id === id)
    if (memo) {
      await Promise.all(getMemoImages(memo).map(deleteImageByUrl))
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
    if (sortMode === 'manual') {
      const oa = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
      const ob = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
      if (oa !== ob) return oa - ob
      return getTime(b.createdAt) - getTime(a.createdAt) // 未設定どうしは新しい順
    }
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

  // 手動モードかつ絞り込みなしのときだけドラッグ可能
  const isFiltering = !!searchQuery.trim() || hiddenColors.size > 0
  const dragEnabled = sortMode === 'manual' && !isFiltering

  // 並べ替え結果（ピン留め→通常の順）を order に採番して保存
  const persistOrder = async (orderedMemos) => {
    const batch = writeBatch(db)
    orderedMemos.forEach((m, i) => {
      if (m.order !== i) batch.update(doc(db, 'memos', m.id), { order: i })
    })
    await batch.commit()
  }

  // セクション（ピン留め / 通常）内でのドラッグ完了処理
  const handleDragEnd = (group) => (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const list = group === 'pinned' ? pinnedMemos : unpinnedMemos
    const oldIndex = list.findIndex((m) => m.id === active.id)
    const newIndex = list.findIndex((m) => m.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(list, oldIndex, newIndex)
    const combined =
      group === 'pinned'
        ? [...reordered, ...unpinnedMemos]
        : [...pinnedMemos, ...reordered]
    // 楽観的にローカルの order を更新（スナップショット待ちのちらつき防止）
    const orderMap = new Map(combined.map((m, i) => [m.id, i]))
    setMemos((prev) =>
      prev.map((m) => (orderMap.has(m.id) ? { ...m, order: orderMap.get(m.id) } : m))
    )
    persistOrder(combined)
  }

  // ドラッグ可否に応じてセクションを描画
  const renderSection = (sectionMemos, group) => {
    if (!dragEnabled) {
      return sectionMemos.map((memo) => (
        <MemoItem
          key={memo.id}
          memo={memo}
          userName={userName}
          onView={handleViewMemo}
          onEdit={handleEditMemo}
          onDelete={handleDeleteMemo}
          onTogglePin={handleTogglePin}
        />
      ))
    }
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(group)}>
        <SortableContext items={sectionMemos.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {sectionMemos.map((memo) => (
            <SortableMemoItem
              key={memo.id}
              memo={memo}
              userName={userName}
              onView={handleViewMemo}
              onEdit={handleEditMemo}
              onDelete={handleDeleteMemo}
              onTogglePin={handleTogglePin}
            />
          ))}
        </SortableContext>
      </DndContext>
    )
  }

  const partnerName = userName === 'あや' ? 'りょう' : 'あや'

  return (
    <div className="memo-app">
      {/* 背景浮遊（ほどよく軽やかに） */}
      {['✨','💫','⭐','✨','💫','⭐','✨','💫','⭐','✨','💫','⭐'].map((s, i) => (
        <span
          key={i}
          className={`bg-sparkle bg-sparkle-${i % 3}`}
          style={{
            left: `${(i * 11 + 4) % 95}%`,
            bottom: `-${8 + (i % 6) * 3}%`,
            fontSize: `${1.3 + (i % 4) * 0.4}rem`,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${7 + (i % 4) * 1.8}s`,
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
          <span className="header-version">v1.11.0</span>
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
          {!allHidden && (
            <button className="color-filter-reset" onClick={hideAllColors}>
              全色解除
            </button>
          )}
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
            <button
              type="button"
              className={`sort-btn${sortMode === 'manual' ? ' active' : ''}`}
              onClick={handleSortManual}
              title="長押ししながら動かして自由に並べ替え"
            >
              ✋ 手動
            </button>
          </div>
          {sortMode === 'manual' && (
            <p className="sort-hint">
              {isFiltering
                ? '⚠️ 検索・絞り込み中は並べ替えできません'
                : '💡 メモを長押ししながら動かすと並べ替えできます'}
            </p>
          )}
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
                {/* 浮遊する小さな光（控えめ） */}
                {['✨','✦','·','✨','✦'].map((s, i) => (
                  <span
                    key={i}
                    className="empty-sparkle"
                    style={{
                      left: `${15 + i * 17}%`,
                      animationDelay: `${i * 0.9}s`,
                      animationDuration: `${5 + (i % 3)}s`,
                      fontSize: `${0.7 + (i % 3) * 0.2}rem`,
                    }}
                  >{s}</span>
                ))}
                <div className="empty-icon-wrap">
                  <span className="empty-emoji empty-emoji-pulse">📝</span>
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
                {renderSection(pinnedMemos, 'pinned')}
              </section>
            )}
            {unpinnedMemos.length > 0 && (
              <section>
                {pinnedMemos.length > 0 && (
                  <h2 className="section-label">📝 メモ一覧</h2>
                )}
                {renderSection(unpinnedMemos, 'unpinned')}
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
