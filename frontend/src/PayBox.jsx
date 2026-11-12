import { useState, useEffect } from 'react'
import { API } from './utils'

const METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank']

// A small box that asks "how much" and "how" before saving a payment.
// It saves the payment itself. When it works it calls onPaid(messageText).
// If it fails, the red message shows inside the box and the box stays open.
function PayBox({ member, onClose, onPaid }) {
  const [amount, setAmount] = useState(String(member.fee))
  const [method, setMethod] = useState('Cash')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Close the box with the Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSave(e) {
    e.preventDefault()
    if (saving) return

    const money = Number(amount)
    if (!(money > 0)) {
      setError('Error: Amount must be more than 0')
      return
    }

    setError('')
    setSaving(true)

    fetch(API + '/members/' + member._id + '/pay', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: money, method: method }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaving(false)
        if (data.error) {
          setError('Error: ' + data.error)
        } else {
          onPaid(
            'Payment of Rs ' +
              money.toLocaleString() +
              ' saved for ' +
              member.name +
              ' (' +
              method +
              ')'
          )
        }
      })
      .catch(() => {
        setSaving(false)
        setError('Error: Could not reach the backend')
      })
  }

  return (
    <div className="photo-modal">
      <div
        className="card"
        style={{
          width: 'min(92vw, 380px)',
          cursor: 'default',
          marginBottom: 0,
        }}
      >
        <h2>✅ Mark as paid</h2>
        <p style={{ margin: '0 0 12px' }}>
          <strong>{member.name}</strong> - {member.packageName} (fee Rs{' '}
          {member.fee.toLocaleString()})
        </p>

        <form onSubmit={handleSave}>
          <label className="form-field">
            Amount paid (Rs)
            <input
              type="number"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ marginTop: '10px' }}>
            Paid by
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <p className="info-note">
            The next due date moves by the full package days, even if the amount
            is different from the fee.
          </p>

          {error && <p className="msg-error">{error}</p>}

          <div style={{ marginTop: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={saving ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {saving ? 'Saving...' : 'Save payment'}
            </button>
            <button type="button" className="grey" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PayBox