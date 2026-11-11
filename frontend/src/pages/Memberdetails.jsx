import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  API,
  daysLeft,
  getColor,
  statusLabel,
  formatDate,
  sendReminder,
} from '../utils'

function MemberDetails({ members, loadMembers }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [bigPhoto, setBigPhoto] = useState(false)

  // The member comes from the list that App.jsx already loaded
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

  // Close the big photo with the Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setBigPhoto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleMarkPaid() {
    if (!window.confirm('Mark ' + member.name + ' as paid?')) return
    setMessage('')

    fetch(API + '/members/' + id + '/pay', { method: 'PUT' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Payment saved')
          loadMembers()
          loadPayments()
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
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

  return (
    <div>
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
          <button title="Mark as paid" onClick={handleMarkPaid}>
            ✅ Mark as paid
          </button>
        </div>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
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
                      <th>Due date before</th>
                      <th>Next due date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td>{formatDate(p.paidOn)}</td>
                        <td>{p.packageName}</td>
                        <td>Rs {p.amount.toLocaleString()}</td>
                        <td>{p.oldDueDate ? formatDate(p.oldDueDate) : '-'}</td>
                        <td>{p.newDueDate ? formatDate(p.newDueDate) : '-'}</td>
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