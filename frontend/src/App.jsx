import { useState, useEffect } from 'react'
import './App.css'

function daysLeft(dueDate) {
  const today = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

function getColor(days) {
  if (days < 0) return 'red'
  if (days <= 7) return 'orange'
  return 'green'
}

function getStatus(days) {
  if (days < 0) return 'Late'
  if (days <= 7) return 'Due soon'
  return 'OK'
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function whatsappNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '92' + digits.slice(1)
  return digits
}

function App() {
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [packageId, setPackageId] = useState('')
  const [message, setMessage] = useState('')

  const [pkgName, setPkgName] = useState('')
  const [pkgFee, setPkgFee] = useState('')
  const [pkgDays, setPkgDays] = useState('')
  const [pkgMessage, setPkgMessage] = useState('')

  function loadMembers() {
    fetch('http://localhost:5000/api/members')
      .then((res) => res.json())
      .then((data) => setMembers(data))
  }

  function loadPackages() {
    fetch('http://localhost:5000/api/packages')
      .then((res) => res.json())
      .then((data) => {
        setPackages(data)
        if (data.length > 0) {
          setPackageId((current) =>
            data.some((p) => p._id === current) ? current : data[0]._id
          )
        } else {
          setPackageId('')
        }
      })
  }

  useEffect(() => {
    loadMembers()
    loadPackages()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    fetch('http://localhost:5000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, packageId }),
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

  function handleAddPackage(e) {
    e.preventDefault()
    setPkgMessage('')

    fetch('http://localhost:5000/api/packages', {
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

  function handleMarkPaid(id, memberName) {
    if (!window.confirm('Mark ' + memberName + ' as paid?')) return

    fetch('http://localhost:5000/api/members/' + id + '/pay', {
      method: 'PUT',
    })
      .then((res) => res.json())
      .then(() => loadMembers())
  }

  function handleDeleteMember(id, memberName) {
    if (!window.confirm('Delete ' + memberName + '?')) return

    fetch('http://localhost:5000/api/members/' + id, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => loadMembers())
  }

  function handleDeletePackage(id) {
    fetch('http://localhost:5000/api/packages/' + id, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => loadPackages())
  }

  function handleSendReminder(m) {
    const days = daysLeft(m.nextDueDate)
    let text
    if (days < 0) {
      text =
        'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
        ' was due on ' + formatDate(m.nextDueDate) +
        '. Please pay as soon as you can. Thank you!'
    } else {
      text =
        'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
        ' is due on ' + formatDate(m.nextDueDate) +
        ' (' + days + ' days left). Please pay on time. Thank you!'
    }

    const url =
      'https://wa.me/' + whatsappNumber(m.phone) + '?text=' + encodeURIComponent(text)
    window.open(url, '_blank')
  }

  return (
    <div className="container">
      <h1>Gym App</h1>

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
            value={packageId}
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
        <h2>Members</h2>
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
              {members.map((m) => {
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
                        onClick={() => handleSendReminder(m)}
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
                    onClick={() => handleDeletePackage(p._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App