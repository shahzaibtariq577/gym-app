import { useState } from 'react'
import {
  API,
  daysLeft,
  getColor,
  getStatus,
  formatDate,
  sendReminder,
} from '../utils'

function Members({ members, packages, loadMembers }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [packageId, setPackageId] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const selectedId = packages.some((p) => p._id === packageId)
    ? packageId
    : packages.length > 0
      ? packages[0]._id
      : ''

  const filtered = members.filter((m) =>
    (m.name + ' ' + m.phone).toLowerCase().includes(search.toLowerCase())
  )

  function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    fetch(API + '/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, packageId: selectedId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Member added')
          setName('')
          setPhone('')
          loadMembers()
        }
      })
  }

  function handleMarkPaid(id, memberName) {
    if (!window.confirm('Mark ' + memberName + ' as paid?')) return

    fetch(API + '/members/' + id + '/pay', { method: 'PUT' })
      .then((res) => res.json())
      .then(() => loadMembers())
  }

  function handleDeleteMember(id, memberName) {
    if (!window.confirm('Delete ' + memberName + '?')) return

    fetch(API + '/members/' + id, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => loadMembers())
  }

  return (
    <div>
      <div className="card">
        <h2>Add Member</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <select
            value={selectedId}
            onChange={(e) => setPackageId(e.target.value)}
          >
            {packages.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} - Rs {p.fee}
              </option>
            ))}
          </select>
          <button type="submit">Add Member</button>
        </form>
        <p>{message}</p>
      </div>

      <div className="card">
        <h2>All Members ({members.length})</h2>
        <input
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Package</th>
                <th>Fee</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const days = daysLeft(m.nextDueDate)
                return (
                  <tr key={m._id}>
                    <td>{m.name}</td>
                    <td>{m.phone}</td>
                    <td>{m.packageName}</td>
                    <td>Rs {m.fee}</td>
                    <td>{formatDate(m.nextDueDate)}</td>
                    <td>
                      <span className={'badge ' + getColor(days)}>
                        {getStatus(days)} ({days} days)
                      </span>
                    </td>
                    <td>
                      <button
                        className="green"
                        onClick={() => sendReminder(m)}
                      >
                        Send reminder
                      </button>
                      <button onClick={() => handleMarkPaid(m._id, m.name)}>
                        Mark as paid
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleDeleteMember(m._id, m.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Members