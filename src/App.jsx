import { useState, useEffect } from 'react'
import { auth, db, googleProvider } from './firebase'
import {
  signInAnonymously,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import Login from './components/Login'
import UserSelect from './components/UserSelect'
import MemoList from './components/MemoList'

const LOGGED_IN_KEY = 'memo_app_logged_in'
const USER_NAME_KEY = 'memo_user_name'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // 未ログイン → 匿名セッションの復元を試みる
        const wasLoggedIn = localStorage.getItem(LOGGED_IN_KEY) === 'true'
        if (wasLoggedIn) {
          try {
            await signInAnonymously(auth)
            // onAuthStateChanged が再び呼ばれて処理される
          } catch {
            localStorage.removeItem(LOGGED_IN_KEY)
            setLoading(false)
          }
        } else {
          setIsLoggedIn(false)
          setUserName(null)
          setLoading(false)
        }
        return
      }

      setIsLoggedIn(true)

      if (user.isAnonymous) {
        // 匿名ユーザー（パスコードログイン）→ localStorage から名前を取得
        setUserName(localStorage.getItem(USER_NAME_KEY))
      } else {
        // Googleユーザー → Firestore からプロフィールを取得
        try {
          const snap = await getDoc(doc(db, 'userProfiles', user.uid))
          setUserName(snap.exists() ? snap.data().userName : null)
        } catch {
          setUserName(null)
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // パスコードログイン
  const handleLogin = async () => {
    await signInAnonymously(auth)
    localStorage.setItem(LOGGED_IN_KEY, 'true')
  }

  // Googleログイン
  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider)
    // onAuthStateChanged が状態を更新する
  }

  // あや/りょう選択
  const handleSelectUser = async (name) => {
    const user = auth.currentUser
    if (user && !user.isAnonymous) {
      await setDoc(doc(db, 'userProfiles', user.uid), { userName: name })
    } else {
      localStorage.setItem(USER_NAME_KEY, name)
    }
    setUserName(name)
  }

  const handleLogout = async () => {
    const user = auth.currentUser
    if (user && !user.isAnonymous) {
      await signOut(auth)
    }
    localStorage.removeItem(LOGGED_IN_KEY)
    localStorage.removeItem(USER_NAME_KEY)
    setIsLoggedIn(false)
    setUserName(null)
  }

  if (loading) {
    return <div className="global-loading"></div>
  }

  if (!isLoggedIn) return <Login onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />
  if (!userName) return <UserSelect onSelect={handleSelectUser} />

  return <MemoList userName={userName} onLogout={handleLogout} />
}

export default App
