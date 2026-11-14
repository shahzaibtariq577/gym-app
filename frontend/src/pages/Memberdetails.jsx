import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CameraCapture from '../CameraCapture'
import PayBox from '../PayBox'
import Slip from '../Slip'
import {
  API,
  daysLeft,
  getColor,
  statusLabel,
  formatDate,
  sendReminder,
  resizePhoto,
} from '../utils'

function MemberDetails({ members, loadMembers }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPay, setShowPay] = useState(false)
  const [slipPayment, setSlipPayment] = useState(null)
  const [bigPhoto, setBigPhoto] = useState(false)
  const [showPhotoEdit, setShowPhotoEdit] = useState(false)
  const [newPhoto, setNewPhoto] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')

  const member = members.find((m) => m._id === id)

  function loadPayments() {
    return fetch(API + '/payments?memberId=' + id)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPayments(data)
          setError('')
        } else {
          setError(data.error || 'Could not load payments')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load payments. Is the backend running?')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadPayments()
  }, [id])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setBigPhoto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openPay() {
    setMessage('')
    setShowPay(true)
  }

  function handlePaid(text) {
    setShowPay(false)
    setMessage(text)
    loadMembers()
    loadPayments()
  }

  function handleUndo(payment) {
    const backText =
      (payment.oldDueDate
        ? ' The due date goes back to ' + formatDate(payment.oldDueDate) + '.'
        : '') +
      (payment.balanceBefore > 0
        ? ' The balance goes back to Rs ' + payment.balanceBefore.toLocaleString() + '.'
        : '')
    const ok = window.confirm(
      'Undo the payment of Rs ' + payment.amount.toLocaleString() + '?' + backText
    )
    if (!ok) return
    setMessage('')

    fetch(API + '/payments/' + payment._id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Payment undone')
          loadMembers()
          loadPayments()
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  function openPhotoEdit() {
    setNewPhoto('')
    setPhotoMessage('')
    setShowPhotoEdit(true)
  }

  function closePhotoEdit() {
    setNewPhoto('')
    setPhotoMessage('')
    setShowPhotoEdit(false)
  }

  function handlePhotoFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Error: Please choose a picture file')
      return
    }
    setPhotoMessage('')
    resizePhoto(file)
      .then((text) => setNewPhoto(text))
      .catch((err) => setPhotoMessage('Error: ' + err.message))
  }

  function handleCameraPhoto(text) {
    setPhotoMessage('')
    setNewPhoto(text)
  }

  function savePhoto(photoText, doneText) {
    setPhotoMessage('')

    fetch(API + '/members/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: photoText }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setPhotoMessage('Error: ' + data.error)
        } else {
          closePhotoEdit()
          setMessage(doneText)
          loadMembers()
        }
      })
      .catch(() => setPhotoMessage('Error: Could not reach the backend'))
  }

  function handleRemovePhoto() {
    if (!window.confirm('Remove the photo of ' + member.name + '?')) return
    savePhoto('', 'Photo removed')
  }

  if (!member) {
    return (
      <div>
        <button className="grey" onClick={() => navigate('/members')}>
          ← Back to members
        </button>
        <p className="msg-error">Member not found.</p>
      </div>
    )
  }

  const days = daysLeft(member.nextDueDate)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const previewPhoto = newPhoto || member.photo

  return (
    <div>
      {slipPayment && (
        <Slip payment={slipPayment} onClose={() => setSlipPayment(null)} />
      )}

      {showPay && (
        <PayBox
          member={member}
          onClose={() => setShowPay(false)}
          onPaid={handlePaid}
        />
      )}

      {bigPhoto && member.photo && (
        <div className="photo-modal" onClick={() => setBigPhoto(false)}>
          <img src={member.photo} alt={member.name} />
          <div className="photo-modal-name">{member.name}</div>
          <button className="grey" onClick={() => setBigPhoto(false)}>
            Close
          </button>
        </div>
      )}

      <button className="grey" onClick={() => navigate('/members')}>
        ← Back to members
      </button>

      <div className="card details-head">
        {member.photo ? (
          <img
            className="details-photo clickable"
            src={member.photo}
            alt={member.name}
            title="Click to see big photo"
            onClick={() => setBigPhoto(true)}
          />
        ) : (
          <div className="details-photo placeholder">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="details-info">
          <h1 className="page-title">{member.name}</h1>
          <span className={'badge ' + getColor(days)}>{statusLabel(days)}</span>
        </div>

        <div className="details-actions">
          <button
            className="green"
            title="Send reminder"
            onClick={() => sendReminder(member)}
          >
            💬 Reminder
          </button>
          <button title="Mark as paid" onClick={openPay}>
            ✅ Mark as paid
          </button>
          <button
            className="grey"
            title="Change photo"
            onClick={openPhotoEdit}
          >
            📷 Change photo
          </button>
        </div>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
      )}

      {showPhotoEdit && (
        <div className="card">
          <h2>📷 Change photo</h2>

          <div className="photo-field">
            {previewPhoto ? (
              <img className="photo-preview" src={previewPhoto} alt="Preview" />
            ) : (
              <div className="photo-empty">👤</div>
            )}
            <div className="photo-info">
              <span className="photo-title">
                {newPhoto
                  ? 'New photo (not saved yet)'
                  : 'Choose a new photo'}
              </span>
              <div className="photo-actions">
                <label className="file-btn">
                  📁 Choose from PC
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoFile}
                  />
                </label>
                <CameraCapture onCapture={handleCameraPhoto} />
              </div>
            </div>
          </div>

          {photoMessage && <p className="msg-error">{photoMessage}</p>}

          <div style={{ marginTop: '14px' }}>
            <button
              disabled={!newPhoto}
              style={!newPhoto ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              onClick={() => savePhoto(newPhoto, 'Photo updated')}
            >
              Save photo
            </button>
            {member.photo && (
              <button className="danger" onClick={handleRemovePhoto}>
                Remove photo
              </button>
            )}
            <button className="grey" onClick={closePhotoEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>👤 Details</h2>
        <div className="details-grid">
          <div>
            <div className="details-label">Phone</div>
            <div>{member.phone}</div>
          </div>
          <div>
            <div className="details-label">Package</div>
            <div>{member.packageName}</div>
          </div>
          <div>
            <div className="details-label">Fee</div>
            <div>Rs {member.fee.toLocaleString()}</div>
          </div>
          {member.balance > 0 && (
            <div>
              <div className="details-label">Balance to pay</div>
              <div style={{ color: '#b91c1c', fontWeight: 700 }}>
                Rs {member.balance.toLocaleString()}
              </div>
            </div>
          )}
          <div>
            <div className="details-label">Joined</div>
            <div>{formatDate(member.joinDate)}</div>
          </div>
          <div>
            <div className="details-label">Next due date</div>
            <div>{formatDate(member.nextDueDate)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>🧾 Payment history</h2>

        {error && <p className="msg-error">Error: {error}</p>}
        {loading && <p>Loading payments...</p>}

        {!loading && !error && (
          <>
            <p className="history-total">
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'}{' '}
              - Total Rs {totalPaid.toLocaleString()}
            </p>

            {payments.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date paid</th>
                      <th>Package</th>
                      <th>Amount</th>
                      <th>Remaining</th>
                      <th>Method</th>
                      <th>Due date before</th>
                      <th>Next due date</th>
                      <th>Slip</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, index) => (
                      <tr key={p._id}>
                        <td>{formatDate(p.paidOn)}</td>
                        <td>{p.packageName}</td>
                        <td>Rs {p.amount.toLocaleString()}</td>
                        <td>
                          {p.balanceAfter > 0
                            ? 'Rs ' + p.balanceAfter.toLocaleString()
                            : '-'}
                        </td>
                        <td>{p.method || '-'}</td>
                        <td>{p.oldDueDate ? formatDate(p.oldDueDate) : '-'}</td>
                        <td>{p.newDueDate ? formatDate(p.newDueDate) : '-'}</td>
                        <td>
                          <button
                            className="grey icon-btn"
                            title="View slip"
                            onClick={() => setSlipPayment(p)}
                          >
                            🧾
                          </button>
                          {p.hasSlip ? ' 📎' : ''}
                        </td>
                        <td>
                          {index === 0 ? (
                            <button
                              className="danger"
                              title="Undo this payment"
                              onClick={() => handleUndo(p)}
                            >
                              ↩ Undo
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {payments.length === 0 && (
              <p>No payments yet for this member.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MemberDetails