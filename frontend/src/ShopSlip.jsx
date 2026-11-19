import { useState, useEffect, useContext, useRef } from 'react'
import { API, formatDate, openWhatsApp } from './utils'
import SettingsContext from './SettingsContext'
import { sendReceiptPdf, receiptLink, saveReceiptPdf } from './receiptPdf'

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

function money(number) {
  return 'Rs ' + Number(number).toLocaleString()
}

function ShopSlip({ sale, publicView, onClose }) {
  const { gymName, gymPhone, gymAddress } = useContext(SettingsContext)
  const [images, setImages] = useState({})
  const [shownKey, setShownKey] = useState('')
  const [loadingKey, setLoadingKey] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sharing, setSharing] = useState(false)
  const receiptRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const payments = sale.payments || []
  const total = sale.total
  const paid = typeof sale.amountPaid === 'number' ? sale.amountPaid : total
  const balance = Math.max(Math.round((total - paid) * 100) / 100, 0)
  const status = balance <= 0 ? 'Paid' : paid > 0 ? 'Part paid' : 'Unpaid'
  const paidAtSale =
    typeof sale.paidAtSale === 'number' ? sale.paidAtSale : paid
  const stampText = status === 'Paid' ? 'PAID' : status.toUpperCase()
  const stampColor = status === 'Paid' ? '#3730a3' : '#b91c1c'
  const receiptNo = 'S-' + String(sale._id).slice(-6).toUpperCase()
  const timeText = new Date(sale.soldOn).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const slipButtons = []
  if (sale.hasSlip) {
    slipButtons.push({
      key: 'first',
      label: payments.length > 0 ? 'slip 1' : 'payment slip',
      url: API + '/shop/sales/' + sale._id + '/slip',
    })
  }
  payments.forEach((p, i) => {
    if (p.hasSlip) {
      slipButtons.push({
        key: String(p._id),
        label: 'slip ' + (i + 2),
        url: API + '/shop/sales/' + sale._id + '/payments/' + p._id + '/slip',
      })
    }
  })

  const shareUrl = API + '/shop/sales/' + sale._id + '/share'

  function sendPdf() {
    if (sharing) return
    setError('')
    setInfo('')
    setSharing(true)
    receiptLink(shareUrl)
      .then((link) =>
        sendReceiptPdf(
          receiptRef.current,
          'receipt-' + receiptNo + '.pdf',
          sale.buyerPhone,
          gymName + ' - Sale receipt ' + receiptNo +
            (link ? '\nReceipt PDF: ' + link : '')
        )
      )
      .then((text) => {
        setSharing(false)
        setInfo(text)
      })
      .catch(() => {
        setSharing(false)
        setError('Error: Could not make the PDF')
      })
  }

  function downloadPdf() {
    if (sharing) return
    setError('')
    setInfo('')
    setSharing(true)
    saveReceiptPdf(receiptRef.current, 'receipt-' + receiptNo + '.pdf')
      .then(() => setSharing(false))
      .catch(() => {
        setSharing(false)
        setError('Error: Could not make the PDF')
      })
  }

  function buildText(link) {
    const lines = [
      gymName + ' - Sale receipt',
      'Receipt no: ' + receiptNo,
      'Date: ' + formatDate(sale.soldOn),
      'Product: ' + sale.quantity + ' x ' + sale.productName,
      'Total: ' + money(total),
      'Total paid: ' + money(paid),
      balance > 0
        ? 'Remaining: ' + money(balance)
        : 'Remaining: Rs 0 (paid in full)',
      'Thank you!',
    ]
    if (link) lines.splice(lines.length - 1, 0, 'Receipt PDF: ' + link)
    return lines.join('\n')
  }

  function sendOnWhatsApp() {
    receiptLink(shareUrl).then((link) =>
      openWhatsApp(sale.buyerPhone, buildText(link))
    )
  }

  function toggleSlip(item) {
    if (shownKey === item.key) {
      setShownKey('')
      return
    }
    if (images[item.key]) {
      setShownKey(item.key)
      return
    }
    setError('')
    setLoadingKey(item.key)
    fetch(item.url)
      .then((res) => res.json())
      .then((data) => {
        setLoadingKey('')
        if (data.error) {
          setError('Error: ' + data.error)
        } else {
          setImages((old) => ({ ...old, [item.key]: data.slip }))
          setShownKey(item.key)
        }
      })
      .catch(() => {
        setLoadingKey('')
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
          ref={receiptRef}
          data-receipt="1"
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
              SALE RECEIPT
            </div>
          </div>

          <Row label="Receipt no" value={receiptNo} />
          <Row
            label="Date"
            value={formatDate(sale.soldOn) + ', ' + timeText}
          />
          <Row label="Customer" value={sale.buyer || 'Walk-in customer'} />
          <Row label="Product" value={sale.productName} />
          <Row label="Quantity" value={sale.quantity} />
          <Row label="Price each" value={money(sale.unitPrice)} />
          <Row label="Total" value={money(total)} strong />
          {paidAtSale > 0 && (
            <Row
              label={'Paid at sale (' + (sale.method || 'Cash') + ')'}
              value={money(paidAtSale)}
            />
          )}
          {payments.map((p) => (
            <Row
              key={p._id}
              label={formatDate(p.paidOn) + ' (' + (p.method || 'Cash') + ')'}
              value={money(p.amount)}
            />
          ))}
          <Row label="Total paid" value={money(paid)} strong />
          {balance > 0 && (
            <Row label="Remaining" value={money(balance)} strong />
          )}
          {balance <= 0 && <Row label="Remaining" value="Rs 0 (paid in full)" />}
          {sale.note && <Row label="Note" value={sale.note} />}

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
              {balance > 0
                ? 'Please pay the remaining amount soon. Thank you!'
                : 'Thank you! Please keep this receipt.'}
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
                {stampText}
              </div>
              <div style={{ fontSize: '11px' }}>
                {formatDate(
                  payments.length > 0
                    ? payments[payments.length - 1].paidOn
                    : sale.soldOn
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
          {publicView ? (
            <button
              className="green"
              disabled={sharing}
              style={sharing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={downloadPdf}
            >
              {sharing ? 'Making PDF...' : '📄 Download PDF'}
            </button>
          ) : (
            <>
              <button
                className="green"
                disabled={sharing}
                style={sharing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                onClick={sendPdf}
              >
                {sharing ? 'Making PDF...' : '📄 Send PDF on WhatsApp'}
              </button>
              <button className="grey" onClick={sendOnWhatsApp}>
                💬 Send as text
              </button>
            </>
          )}
          {slipButtons.map((item) => (
            <button
              key={item.key}
              className="green"
              onClick={() => toggleSlip(item)}
            >
              {loadingKey === item.key
                ? 'Loading...'
                : shownKey === item.key
                  ? 'Hide ' + item.label
                  : '📎 View ' + item.label}
            </button>
          ))}
          {!publicView && (
            <button className="grey" onClick={onClose}>
              Close
            </button>
          )}
        </div>

        {info && (
          <p
            className="msg-ok"
            style={{
              background: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            {info}
          </p>
        )}

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

        {shownKey && images[shownKey] && (
          <img
            src={images[shownKey]}
            alt="Payment slip"
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

export default ShopSlip