import { useState, useEffect } from 'react'
import { API } from './utils'
import Slip from './Slip'

const METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank']
const MAX_SLIP_TEXT = 700000

// Shrink a bank slip picture: longest side 1100 px, saved as small JPEG text.
function resizeSlip(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the slip'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('This file is not a picture'))
      img.onload = () => {
        const maxSide = 1100
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// A small box that asks "how much" and "how" before saving a payment.
// For online payments the owner can also add the bank slip picture.
// After saving, the box shows "Payment saved" with a button to see the slip.
// When the owner closes the box, it calls onPaid(messageText) so the page reloads.
function PayBox({ member, onClose, onPaid }) {
  const [amount, setAmount] = useState(String(member.fee))
  const [method, setMethod] = useState('Cash')
  const [slip, setSlip] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const [showSlip, setShowSlip] = useState(false)

  // Escape key: close the box (the slip window closes itself first)
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape' || showSlip) return
      if (done) onPaid(done.text)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, showSlip])

  function changeMethod(value) {
    setMethod(value)
    if (value === 'Cash') setSlip('')
  }

  function handleSlipFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Error: Please choose a picture file (JPG or PNG)')
      return
    }
    setError('')
    resizeSlip(file)
      .then((text) => {
        if (text.length > MAX_SLIP_TEXT) {
          setError('Error: This picture is too big. Try a smaller one.')
        } else {
          setSlip(text)
        }
      })
      .catch((err) => setError('Error: ' + err.message))
  }

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
      body: JSON.stringify({
        amount: money,
        method: method,
        slipImage: method === 'Cash' ? '' : slip,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaving(false)
        if (data.error) {
          setError('Error: ' + data.error)
        } else {
          setDone({
            payment: data.payment,
            text:
              'Payment of Rs ' +
              money.toLocaleString() +
              ' saved for ' +
              member.name +
              ' (' +
              method +
              ')',
          })
        }
      })
      .catch(() => {
        setSaving(false)
        setError('Error: Could not reach the backend')
      })
  }

  return (
    <>
      <div className="photo-modal">
        <div
          className="card"
          style={{
            width: 'min(92vw, 380px)',
            cursor: 'default',
            marginBottom: 0,
          }}
        >
          {done ? (
            <div>
              <h2>✅ Payment saved</h2>
              <p className="msg-ok">{done.text}</p>
              <div style={{ marginTop: '12px' }}>
                {done.payment && (
                  <button onClick={() => setShowSlip(true)}>🧾 View slip</button>
                )}
                <button className="grey" onClick={() => onPaid(done.text)}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div>
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
                  <select
                    value={method}
                    onChange={(e) => changeMethod(e.target.value)}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                {method !== 'Cash' && (
                  <div style={{ marginTop: '10px' }}>
                    <span className="photo-title">Bank slip (optional)</span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <label className="file-btn">
                        📎 Choose slip picture
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleSlipFile}
                        />
                      </label>
                      {slip && (
                        <>
                          <img
                            src={slip}
                            alt="Bank slip"
                            style={{
                              width: 'auto',
                              height: '60px',
                              maxWidth: '100px',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              border: '1px solid #e0e3ee',
                            }}
                          />
                          <button
                            type="button"
                            className="grey"
                            onClick={() => setSlip('')}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <p className="info-note">
                  The next due date moves by the full package days, even if the
                  amount is different from the fee.
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
          )}
        </div>
      </div>

      {showSlip && done && done.payment && (
        <Slip payment={done.payment} onClose={() => setShowSlip(false)} />
      )}
    </>
  )
}

export default PayBox