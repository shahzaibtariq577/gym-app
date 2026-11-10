import { useState } from 'react'
import { API } from '../utils'

function Packages({ packages, loadPackages }) {
  const [pkgName, setPkgName] = useState('')
  const [pkgFee, setPkgFee] = useState('')
  const [pkgDays, setPkgDays] = useState('')
  const [pkgMessage, setPkgMessage] = useState('')

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
          {packages.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>Rs {p.fee}</td>
              <td>{p.durationDays}</td>
              <td>
                <button
                  className="danger"
                  onClick={() => handleDeletePackage(p._id, p.name)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Packages