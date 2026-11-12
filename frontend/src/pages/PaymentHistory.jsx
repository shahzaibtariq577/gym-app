import { useState, useEffect } from 'react'
import { API, formatDate } from '../utils'

function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

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

  const filtered = payments.filter((p) =>
    (p.memberName + ' ' + p.packageName + ' ' + (p.method || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const total = filtered.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <h1 className="page-title">Payment History</h1>

      <div className="toolbar">
        <input
          placeholder="🔍 Search by member, package or method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="msg-error">Error: {error}</p>}
      {loading && <p>Loading payments...</p>}

      {!loading && !error && (
        <div className="card">
          <p className="history-total">
            {filtered.length} {filtered.length === 1 ? 'payment' : 'payments'}{' '}
            - Total Rs {total.toLocaleString()}
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date paid</th>
                  <th>Member</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Due date before</th>
                  <th>Next due date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paidOn)}</td>
                    <td>{p.memberName}</td>
                    <td>{p.packageName}</td>
                    <td>Rs {p.amount.toLocaleString()}</td>
                    <td>{p.method || '-'}</td>
                    <td>{p.oldDueDate ? formatDate(p.oldDueDate) : '-'}</td>
                    <td>{p.newDueDate ? formatDate(p.newDueDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p>
              No payments yet. When you click Mark as paid for a member, the
              payment shows here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentHistory