import { useState, useEffect } from 'react'
import { API, formatDate } from '../utils'
import Slip from '../Slip'

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

function downloadCsv(rows, fileName) {
  const header = [
    'Date paid',
    'Member',
    'Package',
    'Amount',
    'Remaining',
    'Method',
    'Due date before',
    'Next due date',
    'Bank slip',
  ]
  const lines = [header.map(csvCell).join(',')]

  rows.forEach((p) => {
    lines.push(
      [
        dayKeyOf(p.paidOn),
        p.memberName,
        p.packageName,
        p.amount,
        p.balanceAfter || 0,
        p.method || '',
        p.oldDueDate ? dayKeyOf(p.oldDueDate) : '',
        p.newDueDate ? dayKeyOf(p.newDueDate) : '',
        p.hasSlip ? 'Yes' : 'No',
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [slipPayment, setSlipPayment] = useState(null)
  const [month, setMonth] = useState('all')

  useEffect(() => {
    fetch(API + '/payments')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setPayments(data)
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

  const filtered = payments
    .filter((p) => month === 'all' || monthKeyOf(p.paidOn) === month)
    .filter((p) =>
      (p.memberName + ' ' + p.packageName + ' ' + (p.method || ''))
        .toLowerCase()
        .includes(search.toLowerCase())
    )

  const total = filtered.reduce((sum, p) => sum + p.amount, 0)

  const filterText = month === 'all' ? 'all months' : monthLabel(month)

  function exportCsv() {
    const fileName = 'payments-' + (month === 'all' ? 'all' : month) + '.csv'
    downloadCsv(filtered, fileName)
  }

  return (
    <div>
      {slipPayment && (
        <Slip payment={slipPayment} onClose={() => setSlipPayment(null)} />
      )}

      <h1 className="page-title">Payment History</h1>

      <div className="toolbar">
        <input
          placeholder="🔍 Search by member, package or method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date paid</th>
                  <th>Member</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Remaining</th>
                  <th>Method</th>
                  <th>Due date before</th>
                  <th>Next due date</th>
                  <th>Slip</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paidOn)}</td>
                    <td>{p.memberName}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && payments.length === 0 && (
            <p>
              No payments yet. When you click Mark as paid for a member, the
              payment shows here.
            </p>
          )}
          {filtered.length === 0 && payments.length > 0 && (
            <p>No payments found for {filterText} and this search.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentHistory