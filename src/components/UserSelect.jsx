import './UserSelect.css'

const USERS = [
  { name: 'あや', emoji: '👩', color: '#f953c6' },
  { name: 'りょう', emoji: '👨', color: '#4f8ef7' },
]

export default function UserSelect({ onSelect }) {
  return (
    <div className="userselect-wrapper">
      <div className="userselect-card">
        <div className="userselect-icon">💑</div>
        <h1>あなたはどちら？</h1>
        <p className="userselect-sub">タップして選んでください</p>
        <div className="userselect-btns">
          {USERS.map((u) => (
            <button
              key={u.name}
              className="userselect-btn"
              style={{ '--user-color': u.color }}
              onClick={() => onSelect(u.name)}
            >
              <span className="userselect-emoji">{u.emoji}</span>
              <span className="userselect-name">{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
