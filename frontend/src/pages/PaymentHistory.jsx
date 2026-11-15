import { useState, useEffect } from 'react'
import { API, formatDate } from '../utils'
import Slip from '../Slip'
import ShopSlip from '../ShopSlip'

function pad(number) {
  return String(number).padStart(2, '0')
}

function monthKeyOf(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1)
}

function dayKeyOf(date) {
  const d = new Date(date)
  return monthKeyOf(d) + '-' + pad(d.getDate())
}

function monthLabel(key) {
  const parts = key.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString(
    'en-GB',
    { month: 'long', year: 'numeric' }
  )
}

function csvCell(value) {
  let text = String(value === undefined || value === null ? '' : value)
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function typeText(type) {
  return type === 'shop' ? 'Shop' : 'Gym fee'
}

function gymRow(p) {
  return {
    key: 'g' + p._id,
    type: 'gym',
    date: p.paidOn,
    who: p.memberName,
    what: p.packageName,
    amount: p.amount,
    remaining: p.balanceAfter || 0,
    method: p.method || '',
    oldDue: p.oldDueDate || null,
    newDue: p.newDueDate || null,
    hasSlip: !!p.hasSlip,
    raw: p,
  }
}

function shopRows(s) {
  const rows = []
  const who = s.buyer || 'Walk-in customer'
  const what = s.quantity + ' x ' + s.productName
  const atSale = typeof s.paidAtSale === 'number' ? s.paidAtSale : s.total
  let paidSoFar = 0

  if (atSale > 0) {
    paidSoFar = atSale
    rows.push({
      key: 's' + s._id,
      type: 'shop',
      date: s.soldOn,
      who: who,
      what: what,
      amount: atSale,
      remaining: Math.max(s.total - paidSoFar, 0),
      method: s.method || 'Cash',
      oldDue: null,
      newDue: null,
      hasSlip: !!s.hasSlip,
      raw: s,
    })
  }

  ;(s.payments || []).forEach((p) => {
    paidSoFar += p.amount
    rows.push({
      key: 's' + s._id + 'p' + p._id,
      type: 'shop',
      date: p.paidOn,
      who: who,
      what: what,
      amount: p.amount,
      remaining: Math.max(Math.round((s.total - paidSoFar) * 100) / 100, 0),
      method: p.method || 'Cash',
      oldDue: null,
      newDue: null,
      hasSlip: !!p.hasSlip,
      raw: s,
    })
  })

  return rows
}

function downloadCsv(rows, fileName) {
  const header = [
    'Type',
    'Date paid',
    'Member or buyer',
    'Package or product',
    'Amount',
    'Remaining',
    'Method',
    'Due date before',
    'Next due date',
    'Bank slip',
  ]
  const lines = [header.map(csvCell).join(',')]

  rows.forEach((r) => {
    lines.push(
      [
        typeText(r.type),
        dayKeyOf(r.date),
        r.who,
        r.what,
        r.amount,
        r.remaining,
        r.method,
        r.oldDue ? dayKeyOf(r.oldDue) : '',
        r.newDue ? dayKeyOf(r.newDue) : '',
        r.hasSlip ? 'Yes' : 'No',
      ]
        .map(csvCell)
        .join(',')
    )
  })

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [slipPayment, setSlipPayment] = useState(null)
  const [slipSale, setSlipSale] = useState(null)
  const [month, setMonth] = useState('all')
  const [kind, setKind] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch(API + '/payments').then((res) => res.json()),
      fetch(API + '/shop/sales?month=all')
        .then((res) => res.json())
        .catch(() => []),
    ])
      .then(([payData, saleData]) => {
        if (payData.error) {
          setError(payData.error)
        } else {
          setPayments(payData)
          setSales(Array.isArray(saleData) ? saleData : [])
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load payments. Is the backend running?')
        setLoading(false)
      })
  }, [])

  const now = new Date()
  const thisMonthKey = monthKeyOf(now)
  const lastMonthKey = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const rows = [...payments.map(gymRow), ...sales.flatMap(shopRows)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )

  const filtered = rows
    .filter((r) => kind === 'all' || r.type === kind)
    .filter((r) => month === 'all' || monthKeyOf(r.date) === month)
    .filter((r) =>
      (r.who + ' ' + r.what + ' ' + r.method + ' ' + typeText(r.type))
        .toLowerCase()
        .includes(search.toLowerCase())
    )

  const gymTotal = filtered
    .filter((r) => r.type === 'gym')
    .reduce((sum, r) => sum + r.amount, 0)
  const shopTotal = filtered
    .filter((r) => r.type === 'shop')
    .reduce((sum, r) => sum + r.amount, 0)
  const total = gymTotal + shopTotal

  const filterText = month === 'all' ? 'all months' : monthLabel(month)

  function exportCsv() {
    const fileName = 'payments-' + (month === 'all' ? 'all' : month) + '.csv'
    downloadCsv(filtered, fileName)
  }

  function openSlip(r) {
    if (r.type === 'shop') setSlipSale(r.raw)
    else setSlipPayment(r.raw)
  }

  return (
    <div>
      {slipPayment && (
        <Slip payment={slipPayment} onClose={() => setSlipPayment(null)} />
      )}
      {slipSale && (
        <ShopSlip sale={slipSale} onClose={() => setSlipSale(null)} />
      )}

      <h1 className="page-title">Payment History</h1>

      <div className="toolbar">
        <input
          placeholder="🔍 Search by name, package, product or method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="toolbar">
        <button className={kind === 'all' ? '' : 'grey'} onClick={() => setKind('all')}>
          All types
        </button>
        <button className={kind === 'gym' ? '' : 'grey'} onClick={() => setKind('gym')}>
          🏋️ Gym fees
        </button>
        <button className={kind === 'shop' ? '' : 'grey'} onClick={() => setKind('shop')}>
          🛒 Shop
        </button>
      </div>

      <div className="toolbar">
        <button
          className={month === thisMonthKey ? '' : 'grey'}
          onClick={() => setMonth(thisMonthKey)}
        >
          This month
        </button>
        <button
          className={month === lastMonthKey ? '' : 'grey'}
          onClick={() => setMonth(lastMonthKey)}
        >
          Last month
        </button>
        <button
          className={month === 'all' ? '' : 'grey'}
          onClick={() => setMonth('all')}
        >
          All
        </button>
        <input
          type="month"
          title="Pick a month"
          value={month === 'all' ? '' : month}
          onChange={(e) => setMonth(e.target.value || 'all')}
        />
        <button
          className="grey"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          ⬇ Export CSV
        </button>
      </div>

      {error && <p className="msg-error">Error: {error}</p>}
      {loading && <p>Loading payments...</p>}

      {!loading && !error && (
        <div className="card">
          <p className="history-total">
            {filtered.length} {filtered.length === 1 ? 'payment' : 'payments'}{' '}
            in {filterText} - Total Rs {total.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6b7280' }}>
            Gym fees Rs {gymTotal.toLocaleString()} + Shop Rs{' '}
            {shopTotal.toLocaleString()}
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date paid</th>
                  <th>Member / buyer</th>
                  <th>Package / product</th>
                  <th>Amount</th>
                  <th>Remaining</th>
                  <th>Method</th>
                  <th>Due date before</th>
                  <th>Next due date</th>
                  <th>Slip</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key}>
                    <td>{r.type === 'shop' ? '🛒 Shop' : '🏋️ Gym fee'}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.who}</td>
                    <td>{r.what}</td>
                    <td>Rs {r.amount.toLocaleString()}</td>
                    <td>
                      {r.remaining > 0 ? 'Rs ' + r.remaining.toLocaleString() : '-'}
                    </td>
                    <td>{r.method || '-'}</td>
                    <td>{r.oldDue ? formatDate(r.oldDue) : '-'}</td>
                    <td>{r.newDue ? formatDate(r.newDue) : '-'}</td>
                    <td>
                      <button
                        className="grey icon-btn"
                        title="View slip"
                        onClick={() => openSlip(r)}
                      >
                        🧾
                      </button>
                      {r.hasSlip ? ' 📎' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && rows.length === 0 && (
            <p>
              No payments yet. When you click Mark as paid for a member, or
              sell a product in the Shop, it shows here.
            </p>
          )}
          {filtered.length === 0 && rows.length > 0 && (
            <p>No payments found for {filterText} and this search.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentHistory