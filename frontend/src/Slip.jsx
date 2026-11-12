import { useState, useEffect, useContext } from 'react'
import { API, formatDate } from './utils'
import SettingsContext from './SettingsContext'

// When printing, show only the receipt (not the rest of the page)
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .slip-print, .slip-print * { visibility: visible !important; }
  .slip-print {
    position: fixed !important;
    left: 50% !important;
    top: 0 !important;
    transform: translateX(-50%) !important;
    width: 380px !important;
    box-shadow: none !important;
  }
}
`

function Row({ label, value, strong }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '7px 0',
        borderBottom: '1px dashed #d1d5db',
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// A payment receipt with a stamp. The stamp shows the gym name
// (change it with "Edit name" in the side menu).
// If the payment has a bank slip picture, the owner can open it too.
function Slip({ payment, onClose }) {
  const { gymName, gymPhone, gymAddress } = useContext(SettingsContext)
  const [bankSlip, setBankSlip] = useState('')
  const [showBank, setShowBank] = useState(false)
  const [loadingBank, setLoadingBank] = useState(false)
  const [error, setError] = useState('')

  // Close with the Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fee = payment.feeAtPayment
  const hasFee = typeof fee === 'number'
  const remaining = hasFee ? Math.max(fee - payment.amount, 0) : 0
  const extra = hasFee ? Math.max(payment.amount - fee, 0) : 0
  const partPaid = hasFee && remaining > 0
  const stampColor = partPaid ? '#b91c1c' : '#3730a3'
  const receiptNo = 'R-' + String(payment._id).slice(-6).toUpperCase()
  const timeText = new Date(payment.paidOn).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  function toggleBank() {
    if (showBank) {
      setShowBank(false)
      return
    }
    if (bankSlip) {
      setShowBank(true)
      return
    }
    setError('')
    setLoadingBank(true)
    fetch(API + '/payments/' + payment._id + '/slip')
      .then((res) => res.json())
      .then((data) => {
        setLoadingBank(false)
        if (data.error) {
          setError('Error: ' + data.error)
        } else {
          setBankSlip(data.slip)
          setShowBank(true)
        }
      })
      .catch(() => {
        setLoadingBank(false)
        setError('Error: Could not reach the backend')
      })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        overflowY: 'auto',
        padding: '16px',
        boxSizing: 'border-box',
        background: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <style>{PRINT_CSS}</style>

      <div style={{ margin: 'auto', width: 'min(94vw, 400px)' }}>
        <div
          className="card slip-print"
          style={{ marginBottom: '12px', color: '#1f2937' }}
        >
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid #3730a3',
              paddingBottom: '10px',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3730a3' }}>
              {gymName}
            </div>
            {(gymAddress || gymPhone) && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {[gymAddress, gymPhone].filter(Boolean).join(' | ')}
              </div>
            )}
            <div
              style={{ fontSize: '13px', color: '#6b7280', letterSpacing: '1px' }}
            >
              PAYMENT RECEIPT
            </div>
          </div>

          <Row label="Receipt no" value={receiptNo} />
          <Row
            label="Date paid"
            value={formatDate(payment.paidOn) + ', ' + timeText}
          />
          <Row label="Member" value={payment.memberName} />
          <Row label="Package" value={payment.packageName} />
          {hasFee && <Row label="Package fee" value={'Rs ' + fee.toLocaleString()} />}
          <Row
            label="Amount paid"
            value={'Rs ' + payment.amount.toLocaleString()}
            strong
          />
          {hasFee && remaining > 0 && (
            <Row
              label="Remaining"
              value={'Rs ' + remaining.toLocaleString()}
              strong
            />
          )}
          {hasFee && remaining === 0 && (
            <Row label="Remaining" value="Rs 0 (paid in full)" />
          )}
          {extra > 0 && (
            <Row label="Extra paid" value={'Rs ' + extra.toLocaleString()} />
          )}
          <Row label="Paid by" value={payment.method || 'Cash'} />
          {payment.newDueDate && (
            <Row label="Next due date" value={formatDate(payment.newDueDate)} />
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginTop: '16px',
              minHeight: '90px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', maxWidth: '50%' }}>
              Thank you! Please keep this receipt.
            </div>
            <div
              style={{
                transform: 'rotate(-12deg)',
                border: '3px double ' + stampColor,
                color: stampColor,
                borderRadius: '10px',
                padding: '6px 14px',
                textAlign: 'center',
                fontWeight: 800,
                lineHeight: 1.25,
                opacity: 0.9,
                maxWidth: '50%',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontSize: '11px', letterSpacing: '1px' }}>
                {gymName.toUpperCase()}
              </div>
              <div style={{ fontSize: '22px', letterSpacing: '2px' }}>
                {partPaid ? 'PART PAID' : 'PAID'}
              </div>
              <div style={{ fontSize: '11px' }}>{formatDate(payment.paidOn)}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
          {payment.hasSlip && (
            <button className="green" onClick={toggleBank}>
              {loadingBank
                ? 'Loading...'
                : showBank
                  ? 'Hide bank slip'
                  : '📎 View bank slip'}
            </button>
          )}
          <button className="grey" onClick={onClose}>
            Close
          </button>
        </div>

        {error && (
          <p
            className="msg-error"
            style={{
              background: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}

        {showBank && bankSlip && (
          <img
            src={bankSlip}
            alt="Bank slip"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              marginTop: '12px',
              borderRadius: '10px',
              background: 'white',
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Slip