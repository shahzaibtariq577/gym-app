import { useState } from 'react'
import { API } from '../utils'

const SUGGESTIONS = [
  'Gym Access',
  'Cardio Area',
  'Personal Trainer',
  'Locker',
  'Diet Plan',
]

function FeatureEditor({ features, setFeatures }) {
  const [text, setText] = useState('')

  function addFeature(value) {
    const clean = value.trim()
    if (!clean) return
    if (features.length >= 10) return
    if (features.some((f) => f.toLowerCase() === clean.toLowerCase())) {
      setText('')
      return
    }
    setFeatures([...features, clean])
    setText('')
  }

  function removeFeature(index) {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const unused = SUGGESTIONS.filter(
    (s) => !features.some((f) => f.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="feature-editor">
      <div className="feature-add">
        <input
          maxLength={40}
          placeholder="Add a detail, e.g. Gym Access"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addFeature(text)
            }
          }}
        />
        <button type="button" onClick={() => addFeature(text)}>
          + Add
        </button>
      </div>

      {unused.length > 0 && (
        <div className="suggest">
          {unused.map((s) => (
            <button type="button" key={s} onClick={() => addFeature(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}

      <ul className="feature-list">
        {features.map((f, i) => (
          <li key={f}>
            <span className="tick">✔</span> {f}
            <button
              type="button"
              className="chip-x"
              title="Remove"
              onClick={() => removeFeature(i)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Packages({ packages, members, loadPackages, loadMembers }) {
  const [showForm, setShowForm] = useState(false)
  const [pkgName, setPkgName] = useState('')
  const [pkgFee, setPkgFee] = useState('')
  const [pkgDays, setPkgDays] = useState('')
  const [pkgFeatures, setPkgFeatures] = useState([])
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [editFee, setEditFee] = useState('')
  const [editDays, setEditDays] = useState('')
  const [editFeatures, setEditFeatures] = useState([])

  function memberCount(packageName) {
    return members.filter((m) => m.packageName === packageName).length
  }

  function handleAddPackage(e) {
    e.preventDefault()
    setMessage('')

    const fee = Number(pkgFee)
    const days = Number(pkgDays)

    if (!pkgName.trim()) {
      setMessage('Error: Please type the package name')
      return
    }
    if (!(fee > 0)) {
      setMessage('Error: Fee must be more than 0')
      return
    }
    if (!(days > 0) || !Number.isInteger(days)) {
      setMessage('Error: Days must be a whole number more than 0')
      return
    }

    fetch(API + '/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: pkgName.trim(),
        fee: fee,
        durationDays: days,
        features: pkgFeatures,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Package added')
          setPkgName('')
          setPkgFee('')
          setPkgDays('')
          setPkgFeatures([])
          setShowForm(false)
          loadPackages()
        }
      })
  }

  function startEdit(p) {
    setEditingId(p._id)
    setEditName(p.name)
    setEditFee(String(p.fee))
    setEditDays(String(p.durationDays))
    setEditFeatures(p.features || [])
    setMessage('')
  }

  function cancelEdit() {
    setEditingId('')
  }

  function saveEdit(id) {
    const fee = Number(editFee)
    const days = Number(editDays)

    if (!editName.trim()) {
      setMessage('Error: Package name cannot be empty')
      return
    }
    if (!(fee > 0) || !(days > 0) || !Number.isInteger(days)) {
      setMessage('Error: Fee and days must be numbers more than 0')
      return
    }

    fetch(API + '/packages/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        fee: fee,
        durationDays: days,
        features: editFeatures,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setEditingId('')
          setMessage('Package updated')
          loadPackages()
          loadMembers()
        }
      })
  }

  function handleDeletePackage(id, packageName) {
    if (!window.confirm('Delete package ' + packageName + '?')) return

    fetch(API + '/packages/' + id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Package deleted')
          loadPackages()
        }
      })
  }

  return (
    <div>
      <h1 className="page-title">Our Packages</h1>

      <div className="toolbar">
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : '+ Add Package'}
        </button>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
      )}

      {showForm && (
        <div className="card">
          <h2>📦 Add New Package</h2>
          <form onSubmit={handleAddPackage}>
            <div className="form-grid">
              <label className="form-field">
                Package name *
                <input
                  placeholder="e.g. Monthly"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                />
              </label>
              <label className="form-field">
                Fee (Rs) *
                <input
                  type="number"
                  placeholder="3000"
                  value={pkgFee}
                  onChange={(e) => setPkgFee(e.target.value)}
                />
              </label>
              <label className="form-field">
                Days *
                <input
                  type="number"
                  placeholder="30"
                  value={pkgDays}
                  onChange={(e) => setPkgDays(e.target.value)}
                />
              </label>
            </div>

            <p className="info-note">
              What does this package include? Add details below. They show with
              a check mark on the package card.
            </p>
            <FeatureEditor
              features={pkgFeatures}
              setFeatures={setPkgFeatures}
            />

            <button type="submit">Add Package</button>
          </form>
        </div>
      )}

      {packages.length === 0 && <p>No packages yet. Add your first package.</p>}

      <div className="pkg-grid">
        {packages.map((p) => {
          const isEditing = editingId === p._id
          const count = memberCount(p.name)
          const features = p.features || []
          return (
            <div className="pkg-card" key={p._id}>
              {isEditing ? (
                <div>
                  <input
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Package name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <div>
                    <input
                      type="number"
                      value={editDays}
                      onChange={(e) => setEditDays(e.target.value)}
                    />{' '}
                    days
                  </div>
                  <div>
                    Rs{' '}
                    <input
                      type="number"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                    />
                  </div>
                  <FeatureEditor
                    features={editFeatures}
                    setFeatures={setEditFeatures}
                  />
                </div>
              ) : (
                <>
                  <div className="pkg-name">{p.name}</div>
                  <div className="pkg-days">{p.durationDays} Days</div>
                  <div className="pkg-fee">Rs {p.fee}</div>
                  {features.length > 0 ? (
                    <ul className="pkg-features">
                      {features.map((f) => (
                        <li key={f}>
                          <span className="tick">✔</span> {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="pkg-no-features">No details added</div>
                  )}
                </>
              )}

              <div className="pkg-members">
                👥 {count} {count === 1 ? 'member' : 'members'}
              </div>

              <div className="pkg-actions">
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(p._id)}>Save</button>
                    <button className="grey" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="grey" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleDeletePackage(p._id, p.name)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Packages