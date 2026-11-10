import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import { API } from './utils'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Packages from './pages/Packages'

function Layout() {
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [gymName, setGymName] = useState(
    () => localStorage.getItem('gymName') || 'My Gym'
  )
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')

  function loadMembers() {
    fetch(API + '/members')
      .then((res) => res.json())
      .then((data) => setMembers(data))
  }

  function loadPackages() {
    fetch(API + '/packages')
      .then((res) => res.json())
      .then((data) => setPackages(data))
  }

  useEffect(() => {
    loadMembers()
    loadPackages()
  }, [])

  function startEdit() {
    setNameInput(gymName)
    setEditing(true)
  }

  function saveName(e) {
    e.preventDefault()
    const clean = nameInput.trim()
    if (clean) {
      setGymName(clean)
      localStorage.setItem('gymName', clean)
    }
    setEditing(false)
  }

  function navClass({ isActive }) {
    return isActive ? 'active' : ''
  }

  return (
    <div className="container">
      <div className="header">
        {editing ? (
          <form onSubmit={saveName}>
            <input
              autoFocus
              placeholder="Your gym name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button type="submit">Save</button>
            <button
              type="button"
              className="grey"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1>{gymName}</h1>
            <button className="grey" onClick={startEdit}>
              Edit name
            </button>
          </>
        )}
      </div>

      <nav className="nav">
        <NavLink to="/" end className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/members" className={navClass}>
          Members
        </NavLink>
        <NavLink to="/packages" className={navClass}>
          Packages
        </NavLink>
      </nav>

      <Routes>
        <Route
          path="/"
          element={<Dashboard members={members} loadMembers={loadMembers} />}
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
          path="/packages"
          element={<Packages packages={packages} loadPackages={loadPackages} />}
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default App