import { useState } from 'react'
import { API } from '../utils'

function Packages({ packages, loadPackages }) {
  const [pkgName, setPkgName] = useState('')
  const [pkgFee, setPkgFee] = useState('')
  const [pkgDays, setPkgDays] = useState('')
  const [pkgMessage, setPkgMessage] = useState('')

  const [editingId, setEditingId] = useState('')
  const [editFee, setEditFee] = useState('')
  const [editDays, setEditDays] = useState('')
  const [editMessage, setEditMessage] = useState('')

  function handleAddPackage(e) {
    e.preventDefault()
    setPkgMessage('')

    fetch(API + '/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: pkgName,
        fee: Number(pkgFee),
        durationDays: Number(pkgDays),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setPkgMessage('Error: ' + data.error)
        } else {
          setPkgMessage('Package added')
          setPkgName('')
          setPkgFee('')
          setPkgDays('')
          loadPackages()
        }
      })
  }

  function startEdit(p) {
    setEditingId(p._id)
    setEditFee(String(p.fee))
    setEditDays(String(p.durationDays))
    setEditMessage('')
  }

  function cancelEdit() {
    setEditingId('')
  }

  function saveEdit(id) {
    fetch(API + '/packages/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fee: Number(editFee),
        durationDays: Number(editDays),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setEditMessage('Error: ' + data.error)
        } else {
          setEditingId('')
          setEditMessage('Package updated')
          loadPackages()
        }
      })
  }

  function handleDeletePackage(id, packageName) {
    if (!window.confirm('Delete package ' + packageName + '?')) return

    fetch(API + '/packages/' + id, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => loadPackages())
  }

  return (
    <div className="card">
      <h2>Packages</h2>
      <form onSubmit={handleAddPackage}>
        <input
          placeholder="Package name"
          value={pkgName}
          onChange={(e) => setPkgName(e.target.value)}
        />
        <input
          placeholder="Fee"
          type="number"
          value={pkgFee}
          onChange={(e) => setPkgFee(e.target.value)}
        />
        <input
          placeholder="Days"
          type="number"
          value={pkgDays}
          onChange={(e) => setPkgDays(e.target.value)}
        />
        <button type="submit">Add Package</button>
      </form>
      <p>{pkgMessage}</p>
      <p>{editMessage}</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Fee</th>
            <th>Days</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => {
            const isEditing = editingId === p._id
            return (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                    />
                  ) : (
                    'Rs ' + p.fee
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editDays}
                      onChange={(e) => setEditDays(e.target.value)}
                    />
                  ) : (
                    p.durationDays
                  )}
                </td>
                <td>
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
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Packages