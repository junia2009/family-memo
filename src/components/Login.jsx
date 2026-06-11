import { useState } from 'react'
import './Login.css'

const FLOATS = ['⭐', '✨', '🌟', '💫', '🏰', '🎠', '🌙', '🪄', '🎡', '👑']

export default function Login({ onLogin, onGoogleLogin }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const correct = import.meta.env.VITE_APP_PASSCODE
    if (!correct) {
      setError('.env.local にパスコードが設定されていません')
      return
    }

    if (passcode === correct) {
      setSuccess(true)
      setLoading(true)
      try {
        await onLogin()
      } catch {
        setError('接続に失敗しました。もう一度試してください。')
        setLoading(false)
        setSuccess(false)
      }
    } else {
      setShake(true)
      setError('パスコードが違います')
      setPasscode('')
      setTimeout(() => setShake(false), 600)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await onGoogleLogin()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Googleログインに失敗しました')
      }
      setGoogleLoading(false)
    }
  }

  return (
    <div className={`login-wrapper${success ? ' login-success' : ''}`}>
      {/* 浮遊するアニメーション要素 */}
      {FLOATS.map((emoji, i) => (
        <span
          key={i}
          className="login-float"
          style={{
            left: `${(i * 11 + 5) % 95}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${5 + (i % 4)}s`,
            fontSize: `${1.2 + (i % 3) * 0.4}rem`,
          }}
        >
          {emoji}
        </span>
      ))}

      <div className={`login-card${shake ? ' shake' : ''}`}>
        <div className="login-hero">
          <div className="login-icon-wrap">
            <span className="login-icon">💑</span>
            <span className="login-icon-ring" />
            <span className="login-icon-ring login-icon-ring2" />
          </div>
          <h1>家族めも</h1>
          <p className="login-subtitle">家族だけの共有メモ帳</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <p className="login-label">パスコードを入力</p>

          {/* ドット表示 */}
          <div className="passcode-dots">
            {Array.from({ length: Math.max(passcode.length, 4) }).map((_, i) => (
              <span
                key={i}
                className={`dot${i < passcode.length ? ' filled' : ''}`}
              />
            ))}
          </div>

          <input
            type="password"
            value={passcode}
            onChange={(e) => { setPasscode(e.target.value); setError('') }}
            placeholder="パスコード"
            className="login-input"
            autoFocus
            autoComplete="current-password"
          />

          {error && (
            <p className="login-error">
              <span>⚠️</span> {error}
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || googleLoading || !passcode}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> 接続中...
              </span>
            ) : (
              <span>💕 ログイン</span>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>または</span>
        </div>

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogle}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <span className="btn-loading"><span className="spinner" /> 接続中...</span>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Googleでログイン
            </>
          )}
        </button>

        <p className="login-version">v1.8.0</p>
      </div>
    </div>
  )
}
