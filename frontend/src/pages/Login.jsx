import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API } from '../utils'
import { setToken } from '../auth'

const PRODUCT = 'GymDesk'

function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (busy) return

    if (!username.trim() || !password) {
      setError('Error: Please type the username and the password')
      return
    }

    setError('')
    setBusy(true)

    fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password: password }),
    })
      .then((res) => res.json())
      .then((data) => {
        setBusy(false)
        if (data.error) {
          setError('Error: ' + data.error)
        } else {
          setToken(data.token)
          onLoggedIn()
        }
      })
      .catch(() => {
        setBusy(false)
        setError('Error: Could not reach the backend. Is it running?')
      })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="card"
        style={{ width: 'min(94vw, 360px)', marginBottom: 0 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '40px' }}>🏋️</div>
          <h1 className="page-title" style={{ margin: '4px 0 2px' }}>
            {PRODUCT}
          </h1>
          <div style={{ color: '#6b7280' }}>Owner login</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            Username
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ marginTop: '10px' }}>
            Password
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              marginTop: '8px',
            }}
          >
            <input
              type="checkbox"
              style={{ margin: 0 }}
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show password
          </label>

          {error && <p className="msg-error">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              margin: '14px 0 0',
              ...(busy ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            }}
          >
            {busy ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          New gym? <Link to="/signup">Sign up</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '6px', fontSize: '14px' }}>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
  )
}

export default Login