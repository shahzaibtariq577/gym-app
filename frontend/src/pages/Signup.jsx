import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API } from '../utils'
import { setToken } from '../auth'

const PRODUCT = 'GymDesk'

function Signup({ onLoggedIn }) {
  const [gymName, setGymName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (busy) return

    const name = gymName.trim()
    const user = username.trim().toLowerCase()

    if (name.length < 2) {
      setError('Error: Please type your gym name (at least 2 letters)')
      return
    }
    if (user.length < 3) {
      setError('Error: Username must have at least 3 characters')
      return
    }
    if (!/^[a-z0-9_.-]+$/.test(user)) {
      setError(
        'Error: Username can have only letters, numbers, dot, dash and underscore'
      )
      return
    }
    if (password.length < 8) {
      setError('Error: Password must have at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Error: The two passwords are not the same')
      return
    }

    setError('')
    setBusy(true)

    fetch(API + '/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymName: name,
        username: user,
        password: password,
      }),
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
        style={{ width: 'min(94vw, 380px)', marginBottom: 0 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '40px' }}>🏋️</div>
          <h1 className="page-title" style={{ margin: '4px 0 2px' }}>
            {PRODUCT}
          </h1>
          <div style={{ color: '#6b7280' }}>Sign up your gym</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            Gym name
            <input
              autoFocus
              maxLength={40}
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ marginTop: '10px' }}>
            Username
            <input
              autoComplete="username"
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ marginTop: '10px' }}>
            Password (at least 8 characters)
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ marginTop: '10px' }}>
            Type the password again
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            Show passwords
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
            {busy ? 'Creating your gym...' : 'Create my gym'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '6px', fontSize: '14px' }}>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup