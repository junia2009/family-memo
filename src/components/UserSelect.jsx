import './UserSelect.css'

const USERS = [
  { name: 'あや', emoji: '👩', color: '#b06a85' },
  { name: 'りょう', emoji: '👨', color: '#5f7fa8' },
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
