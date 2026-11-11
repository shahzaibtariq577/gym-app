import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CameraCapture from '../CameraCapture'
import {
  API,
  daysLeft,
  getColor,
  getStatus,
  statusLabel,
  formatDate,
  sendReminder,
  resizePhoto,
} from '../utils'

const PAGE_SIZE = 10
const FILTERS = { all: 'All Status', late: 'Late', soon: 'Due soon', ok: 'OK' }
const STATUS_OF = { late: 'Late', soon: 'Due soon', ok: 'OK' }

// Turn a date into text like 2026-11-30 for the date box
function toInputDate(date) {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + month + '-' + day
}

function Members({ members, packages, loadMembers }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const statusFilter = FILTERS[statusParam] ? statusParam : 'all'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [packageId, setPackageId] = useState('')
  const [photo, setPhoto] = useState('')
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPackageId, setEditPackageId] = useState('')
  const [editOldPackageId, setEditOldPackageId] = useState('')
  const [editStartToday, setEditStartToday] = useState(false)
  const [editDueDate, setEditDueDate] = useState('')
  const [editOldDueDate, setEditOldDueDate] = useState('')
  const [editMessage, setEditMessage] = useState('')

  const selectedId = packages.some((p) => p._id === packageId)
    ? packageId
    : packages.length > 0
      ? packages[0]._id
      : ''
  const selectedPackage = packages.find((p) => p._id === selectedId)

  let duePreview = 'Auto calculated'
  if (selectedPackage) {
    const d = new Date()
    d.setDate(d.getDate() + selectedPackage.durationDays)
    duePreview = formatDate(d)
  }

  const filtered = members.filter((m) => {
    const textMatch = (m.name + ' ' + m.phone)
      .toLowerCase()
      .includes(search.toLowerCase())
    const statusMatch =
      statusFilter === 'all' ||
      getStatus(daysLeft(m.nextDueDate)) === STATUS_OF[statusFilter]
    return textMatch && statusMatch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : start + 1
  const showingTo = Math.min(start + PAGE_SIZE, filtered.length)

  function changeFilter(value) {
    if (value === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ status: value })
    }
    setPage(0)
  }

  function changeSearch(value) {
    setSearch(value)
    setPage(0)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) {
      setPhoto('')
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Error: Please choose a picture file')
      setPhoto('')
      return
    }
    setMessage('')
    resizePhoto(file)
      .then((text) => setPhoto(text))
      .catch((err) => {
        setPhoto('')
        setMessage('Error: ' + err.message)
      })
  }

  function handleCameraPhoto(text) {
    setMessage('')
    setPhoto(text)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    const digits = phone.replace(/\D/g, '')
    if (!name.trim()) {
      setMessage('Error: Please type the member name')
      return
    }
    if (digits.length < 10) {
      setMessage('Error: Phone number must have at least 10 digits')
      return
    }
    if (!selectedId) {
      setMessage('Error: Please add a package first')
      return
    }

    fetch(API + '/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        packageId: selectedId,
        photo: photo,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Member added')
          setName('')
          setPhone('')
          setPhoto('')
          setShowForm(false)
          loadMembers()
        }
      })
  }

  function startEdit(m) {
    const current = packages.find((p) => p.name === m.packageName)
    const dueText = toInputDate(m.nextDueDate)
    setEditingId(m._id)
    setEditName(m.name)
    setEditPhone(m.phone)
    setEditPackageId(current ? current._id : '')
    setEditOldPackageId(current ? current._id : '')
    setEditStartToday(false)
    setEditDueDate(dueText)
    setEditOldDueDate(dueText)
    setEditMessage('')
  }

  function cancelEdit() {
    setEditingId('')
  }

  function changeEditPackage(value) {
    setEditPackageId(value)
    setEditStartToday(false)
  }

  function saveEdit(id) {
    const digits = editPhone.replace(/\D/g, '')
    if (!editName.trim() || digits.length < 10) {
      setEditMessage('Error: Name is needed and phone must have 10+ digits')
      return
    }
    if (!editDueDate) {
      setEditMessage('Error: Please choose a due date')
      return
    }

    const packageChanged =
      editPackageId !== '' && editPackageId !== editOldPackageId
    const startToday = packageChanged && editStartToday
    const newPackage = packages.find((p) => p._id === editPackageId)

    if (startToday && newPackage) {
      const ok = window.confirm(
        'Start ' +
          newPackage.name +
          ' from today? This saves a payment of Rs ' +
          newPackage.fee +
          '.'
      )
      if (!ok) return
    }

    const body = { name: editName.trim(), phone: editPhone.trim() }
    if (editPackageId) body.packageId = editPackageId
    if (startToday) {
      body.startToday = true
    } else if (editDueDate !== editOldDueDate) {
      // Send the due date only if the owner changed it
      body.nextDueDate = editDueDate
    }

    fetch(API + '/members/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setEditMessage('Error: ' + data.error)
        } else {
          setEditingId('')
          setEditMessage('Member updated')
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
      <h1 className="page-title">Members</h1>

      <div className="toolbar">
        <input
          placeholder="🔍 Search by name or phone..."
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => changeFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="late">Late</option>
          <option value="soon">Due soon</option>
          <option value="ok">OK</option>
        </select>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : '+ Add Member'}
        </button>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
      )}

      {showForm && (
        <div className="card">
          <h2>👤 Add New Member</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field">
                Full name *
                <input
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="form-field">
                Phone number *
                <input
                  placeholder="03xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="form-field">
                Package *
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
              </label>
              <label className="form-field">
                Fee (Rs)
                <input
                  readOnly
                  value={selectedPackage ? selectedPackage.fee : ''}
                />
              </label>
              <label className="form-field">
                Next due date
                <input readOnly value={duePreview} />
              </label>

              <div className="photo-field">
                {photo ? (
                  <img className="photo-preview" src={photo} alt="Preview" />
                ) : (
                  <div className="photo-empty">👤</div>
                )}
                <div className="photo-info">
                  <span className="photo-title">Photo (optional)</span>
                  <div className="photo-actions">
                    <label className="file-btn">
                      📁 Choose from PC
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoChange}
                      />
                    </label>
                    <CameraCapture onCapture={handleCameraPhoto} />
                  </div>
                </div>
              </div>

              <button type="submit">Add Member</button>
            </div>
          </form>
          <p className="info-note">
            ✅ Auto calculation: the next due date is worked out from the
            selected package.
          </p>
        </div>
      )}

      <div className="card">
        {editMessage && (
          <p
            className={
              editMessage.startsWith('Error') ? 'msg-error' : 'msg-ok'
            }
          >
            {editMessage}
          </p>
        )}

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
              {visible.map((m) => {
                const days = daysLeft(m.nextDueDate)
                const isEditing = editingId === m._id
                const editPackage = packages.find(
                  (p) => p._id === editPackageId
                )
                const packageChanged =
                  editPackageId !== '' && editPackageId !== editOldPackageId
                const startTodayOn = packageChanged && editStartToday

                let dueBoxValue = editDueDate
                if (startTodayOn && editPackage) {
                  const d = new Date()
                  d.setDate(d.getDate() + editPackage.durationDays)
                  dueBoxValue = toInputDate(d)
                }

                return (
                  <tr key={m._id}>
                    <td>
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <div className="member-cell">
                          {m.photo ? (
                            <img
                              className="member-photo"
                              src={m.photo}
                              alt={m.name}
                            />
                          ) : (
                            <div className="member-photo placeholder">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{m.name}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      ) : (
                        m.phone
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div>
                          <select
                            value={editPackageId}
                            onChange={(e) => changeEditPackage(e.target.value)}
                          >
                            {!editPackageId && (
                              <option value="">Choose package</option>
                            )}
                            {packages.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          {packageChanged && (
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                marginTop: '6px',
                              }}
                            >
                              <input
                                type="checkbox"
                                style={{ margin: 0, padding: 0 }}
                                checked={editStartToday}
                                onChange={(e) =>
                                  setEditStartToday(e.target.checked)
                                }
                              />
                              Start new package from today
                            </label>
                          )}
                        </div>
                      ) : (
                        m.packageName
                      )}
                    </td>
                    <td>
                      Rs {isEditing && editPackage ? editPackage.fee : m.fee}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="date"
                          value={dueBoxValue}
                          disabled={startTodayOn}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                      ) : (
                        formatDate(m.nextDueDate)
                      )}
                    </td>
                    <td>
                      <span className={'badge ' + getColor(days)}>
                        {statusLabel(days)}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(m._id)}>Save</button>
                          <button className="grey" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="green icon-btn"
                            title="Send reminder"
                            onClick={() => sendReminder(m)}
                          >
                            💬
                          </button>
                          <button
                            className="grey icon-btn"
                            title="Edit"
                            onClick={() => startEdit(m)}
                          >
                            ✏️
                          </button>
                          <button
                            className="icon-btn"
                            title="Mark as paid"
                            onClick={() => handleMarkPaid(m._id, m.name)}
                          >
                            ✅
                          </button>
                          <button
                            className="danger icon-btn"
                            title="Delete"
                            onClick={() => handleDeleteMember(m._id, m.name)}
                          >
                            🗑️
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

        {filtered.length === 0 && <p>No members found.</p>}

        <div className="pager">
          <span>
            Showing {showingFrom}-{showingTo} of {filtered.length} members
          </span>
          <span>
            <button
              className="grey"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              ‹ Previous
            </button>
            Page {safePage + 1} of {totalPages}
            <button
              className="grey"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next ›
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Members