import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import './App.css'
import { API } from './utils'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Packages from './pages/Packages'
import PaymentHistory from './pages/PaymentHistory'
import MemberDetails from './pages/Memberdetails'
import Login from './pages/Login'
import Settings from './pages/Settings'
import SettingsContext from './SettingsContext'
import { getToken, clearToken } from './auth'

const LOAD_ERROR = 'Could not load data. Is the backend running?'

function Layout({ onLogout }) {
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [settings, setSettings] = useState({
    gymName: 'My Gym',
    gymPhone: '',
    gymAddress: '',
    ownerName: '',
    ownerPhoto: '',
    username: '',
  })

  function loadMembers() {
    return fetch(API + '/members')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data)
          setLoadError('')
        } else {
          setLoadError(LOAD_ERROR)
        }
      })
      .catch(() => setLoadError(LOAD_ERROR))
  }

  function loadPackages() {
    return fetch(API + '/packages')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPackages(data)
          setLoadError('')
        } else {
          setLoadError(LOAD_ERROR)
        }
      })
      .catch(() => setLoadError(LOAD_ERROR))
  }

  function loadSettings() {
    return fetch(API + '/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setLoadError(LOAD_ERROR)
          return
        }
        setSettings(data)

        // One time: move the gym name this browser saved before into the database
        const old = localStorage.getItem('gymName')
        if (old && old !== 'My Gym' && data.gymName === 'My Gym') {
          return fetch(API + '/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gymName: old }),
          })
            .then((res) => res.json())
            .then((saved) => {
              if (!saved.error) {
                setSettings(saved)
                localStorage.removeItem('gymName')
              }
            })
        }
        if (old) localStorage.removeItem('gymName')
      })
      .catch(() => setLoadError(LOAD_ERROR))
  }

  useEffect(() => {
    Promise.all([loadMembers(), loadPackages(), loadSettings()]).then(() =>
      setLoading(false)
    )
  }, [])

  function navClass({ isActive }) {
    return isActive ? 'active' : ''
  }

  return (
    <SettingsContext.Provider value={{ ...settings, setSettings }}>
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🏋️</div>
          <div className="brand-name">{settings.gymName}</div>
        </div>

        <nav className="side-nav">
          <NavLink to="/" end className={navClass}>
            🏠 Dashboard
          </NavLink>
          <NavLink to="/members" className={navClass}>
            👥 Members
          </NavLink>
          <NavLink to="/packages" className={navClass}>
            📦 Packages
          </NavLink>
          <NavLink to="/payments" className={navClass}>
            🧾 Payment History
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            ⚙️ Settings
          </NavLink>
        </nav>

        <button
          className="link-btn"
          style={{ margin: '12px 14px 0', alignSelf: 'flex-start' }}
          onClick={onLogout}
        >
          Log out
        </button>

        <div className="side-footer">
          <Link
            to="/settings"
            title="Open settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {settings.ownerPhoto ? (
              <img
                className="avatar"
                src={settings.ownerPhoto}
                alt="Owner"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar">👤</div>
            )}
            <div>
              <div>{settings.ownerName || 'Gym Owner'}</div>
              <small>Admin</small>
            </div>
          </Link>
        </div>
      </aside>

      <main className="main">
        {loadError && <p className="msg-error">{loadError}</p>}

        {loading ? (
          <div className="card">Loading...</div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard members={members} loadMembers={loadMembers} />
              }
            />
            <Route
              path="/members"
              element={
                <Members
                  members={members}
                  packages={packages}
                  loadMembers={loadMembers}
                />
              }
            />
            <Route
              path="/members/:id"
              element={
                <MemberDetails members={members} loadMembers={loadMembers} />
              }
            />
            <Route
              path="/packages"
              element={
                <Packages
                  packages={packages}
                  members={members}
                  loadPackages={loadPackages}
                  loadMembers={loadMembers}
                />
              }
            />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        )}
      </main>
    </div>
    </SettingsContext.Provider>
  )
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => getToken() !== '')

  // auth.js sends this event when the backend says "please log in"
  // (for example when the login has expired)
  useEffect(() => {
    function onLogout() {
      setLoggedIn(false)
    }
    window.addEventListener('gym-logout', onLogout)
    return () => window.removeEventListener('gym-logout', onLogout)
  }, [])

  function handleLogout() {
    clearToken()
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <Login onLoggedIn={() => setLoggedIn(true)} />
  }

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout} />
    </BrowserRouter>
  )
}

export default App