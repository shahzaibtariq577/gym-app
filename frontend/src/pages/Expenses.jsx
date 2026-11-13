import { useState, useEffect } from 'react'
import { API, formatDate } from '../utils'

const CATEGORIES = [
  { name: 'Electricity', icon: '⚡' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Staff salary', icon: '👷' },
  { name: 'Equipment repair', icon: '🔧' },
  { name: 'New equipment', icon: '🏋️' },
  { name: 'Internet', icon: '🌐' },
  { name: 'Cleaning', icon: '🧹' },
  { name: 'Other', icon: '📦' },
]
const MAX_BILL_TEXT = 700000

function iconOf(name) {
  const found = CATEGORIES.find((c) => c.name === name)
  return found ? found.icon : '📦'
}

function money(number) {
  return 'Rs ' + Number(number).toLocaleString()
}

function pad(number) {
  return String(number).padStart(2, '0')
}

// A date -> "2026-11" (for the month)
function monthText(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1)
}

// A date -> "2026-11-30" (for the date box)
function toInputDate(date) {
  const d = new Date(date)
  return monthText(d) + '-' + pad(d.getDate())
}

// "2026-11" -> "November 2026" (or "Nov 2026" when short)
function monthLabel(text, short) {
  const parts = text.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString(
    'en-GB',
    { month: short ? 'short' : 'long', year: 'numeric' }
  )
}

// "2026-11" + 1 -> "2026-12"
function shiftMonth(text, step) {
  const parts = text.split('-')
  return monthText(new Date(Number(parts[0]), Number(parts[1]) - 1 + step, 1))
}

// Shrink a bill picture: longest side 1100 px, saved as small JPEG text
// (the same idea as the bank slip picture in PayBox.jsx)
function resizeBill(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the picture'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('This file is not a picture'))
      img.onload = () => {
        const scale = Math.min(1, 1100 / Math.max(img.width, img.height))
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

// The Expenses page: insights (earned, spent, profit, by category, last 6 months)
// and the list of expenses of the chosen month.
function Expenses() {
  const thisMonth = monthText(new Date())
  const [month, setMonth] = useState(thisMonth)
  const [expenses, setExpenses] = useState([])
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // The add / edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [date, setDate] = useState(toInputDate(new Date()))
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [bill, setBill] = useState(null) // null = not changed, '' = remove, text = new picture
  const [hadBill, setHadBill] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // The big bill picture window
  const [viewBill, setViewBill] = useState(null)

  function loadAll(m) {
    setError('')
    return Promise.all([
      fetch(API + '/expenses?month=' + m).then((res) => res.json()),
      fetch(API + '/expenses/insights?month=' + m).then((res) => res.json()),
    ])
      .then(([list, insight]) => {
        if (Array.isArray(list) && !insight.error) {
          setExpenses(list)
          setInsights(insight)
        } else {
          setError(
            (list && list.error) ||
              (insight && insight.error) ||
              'Could not load expenses'
          )
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load expenses. Is the backend running?')
        setLoading(false)
      })
  }

  useEffect(() => {
    setLoading(true)
    loadAll(month)
  }, [month])

  // Close the bill window with the Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setViewBill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openAdd() {
    setEditingId('')
    setDate(toInputDate(new Date()))
    setCategory(CATEGORIES[0].name)
    setAmount('')
    setNote('')
    setBill(null)
    setHadBill(false)
    setFormError('')
    setMessage('')
    setShowForm(true)
  }

  function openEdit(e) {
    setEditingId(e._id)
    setDate(toInputDate(e.date))
    setCategory(e.category)
    setAmount(String(e.amount))
    setNote(e.note || '')
    setBill(null)
    setHadBill(!!e.hasBill)
    setFormError('')
    setMessage('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId('')
    setFormError('')
  }

  function handleBillFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('Error: Please choose a picture file (JPG or PNG)')
      return
    }
    setFormError('')
    resizeBill(file)
      .then((text) => {
        if (text.length > MAX_BILL_TEXT) {
          setFormError('Error: This picture is too big. Try a smaller one.')
        } else {
          setBill(text)
        }
      })
      .catch((err) => setFormError('Error: ' + err.message))
  }

  function handleSave(e) {
    e.preventDefault()
    if (saving) return

    if (!date) {
      setFormError('Error: Please choose the date')
      return
    }
    if (!(Number(amount) > 0)) {
      setFormError('Error: Amount must be more than 0')
      return
    }

    setFormError('')
    setSaving(true)

    const body = {
      date: date,
      category: category,
      amount: Number(amount),
      note: note,
    }
    if (bill !== null) body.billImage = bill

    const url = editingId
      ? API + '/expenses/' + editingId
      : API + '/expenses'

    fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaving(false)
        if (data.error) {
          setFormError('Error: ' + data.error)
        } else {
          closeForm()
          setMessage(editingId ? 'Expense updated' : 'Expense added')
          // show the month of the saved expense
          const savedMonth = date.slice(0, 7)
          if (savedMonth !== month) setMonth(savedMonth)
          else loadAll(month)
        }
      })
      .catch(() => {
        setSaving(false)
        setFormError('Error: Could not reach the backend')
      })
  }

  function handleDelete(item) {
    const ok = window.confirm(
      'Delete the expense ' + item.category + ' of ' + money(item.amount) + '?'
    )
    if (!ok) return
    setMessage('')

    fetch(API + '/expenses/' + item._id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Expense deleted')
          loadAll(month)
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  function openBill(id) {
    setViewBill({ loading: true })
    fetch(API + '/expenses/' + id + '/bill')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setViewBill({ error: 'Error: ' + data.error })
        else setViewBill({ image: data.bill })
      })
      .catch(() =>
        setViewBill({ error: 'Error: Could not reach the backend' })
      )
  }

  // Sizes for the bar charts
  const maxCategory =
    insights && insights.byCategory.length > 0
      ? Math.max(...insights.byCategory.map((c) => c.total))
      : 1
  const maxTrend = insights
    ? Math.max(1, ...insights.trend.map((t) => Math.max(t.earned, t.spent)))
    : 1
  const barHeight = (value) =>
    value > 0 ? Math.max(3, Math.round((value / maxTrend) * 110)) : 0

  return (
    <div>
      {viewBill && (
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
          onClick={() => setViewBill(null)}
        >
          <div
            style={{ margin: 'auto', width: 'min(94vw, 500px)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {viewBill.loading && <p style={{ color: 'white' }}>Loading...</p>}
            {viewBill.error && (
              <p
                className="msg-error"
                style={{ background: 'white', padding: '8px 12px', borderRadius: '8px' }}
              >
                {viewBill.error}
              </p>
            )}
            {viewBill.image && (
              <img
                src={viewBill.image}
                alt="Bill"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  borderRadius: '10px',
                  background: 'white',
                }}
              />
            )}
            <div style={{ marginTop: '12px' }}>
              <button className="grey" onClick={() => setViewBill(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="page-title">Expenses</h1>

      <div className="toolbar">
        <button className="grey" onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹ Previous
        </button>
        <strong style={{ minWidth: '130px', textAlign: 'center' }}>
          {monthLabel(month)}
        </strong>
        <button
          className="grey"
          disabled={month >= thisMonth}
          style={month >= thisMonth ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          Next ›
        </button>
        <button
          style={{ marginLeft: 'auto' }}
          onClick={showForm ? closeForm : openAdd}
        >
          {showForm ? 'Close' : '+ Add expense'}
        </button>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
      )}
      {error && <p className="msg-error">Error: {error}</p>}

      {showForm && (
        <div className="card">
          <h2>{editingId ? '✏️ Edit expense' : '💸 Add expense'}</h2>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <label className="form-field">
                Date *
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="form-field">
                Category *
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Amount (Rs) *
                <input
                  type="number"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="form-field">
                Note (optional)
                <input
                  maxLength={200}
                  placeholder="e.g. October bill"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span className="photo-title">Bill picture (optional)</span>
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
                  📎 {hadBill || bill ? 'Replace bill picture' : 'Choose bill picture'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBillFile}
                  />
                </label>
                {bill && (
                  <img
                    src={bill}
                    alt="Bill"
                    style={{
                      height: '60px',
                      maxWidth: '100px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid #e0e3ee',
                    }}
                  />
                )}
                {!bill && hadBill && bill === null && (
                  <span className="photo-title">A bill picture is saved</span>
                )}
                {(bill || (hadBill && bill === null)) && (
                  <button type="button" className="grey" onClick={() => setBill('')}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {formError && <p className="msg-error">{formError}</p>}

            <div style={{ marginTop: '14px' }}>
              <button
                type="submit"
                disabled={saving}
                style={saving ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save expense'}
              </button>
              <button type="button" className="grey" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {insights && (
        <>
          <div className="summary">
            <div className="summary-box green">
              <div className="summary-icon">💰</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(insights.earned)}
                </div>
                <div className="summary-label">
                  Earned ({insights.paymentCount}{' '}
                  {insights.paymentCount === 1 ? 'payment' : 'payments'})
                </div>
              </div>
            </div>
            <div className="summary-box orange">
              <div className="summary-icon">💸</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(insights.spent)}
                </div>
                <div className="summary-label">
                  Spent ({insights.expenseCount}{' '}
                  {insights.expenseCount === 1 ? 'expense' : 'expenses'})
                </div>
              </div>
            </div>
            <div className={'summary-box ' + (insights.profit >= 0 ? 'blue' : 'red')}>
              <div className="summary-icon">
                {insights.profit >= 0 ? '📈' : '📉'}
              </div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {insights.profit < 0 ? '-' : ''}
                  {money(Math.abs(insights.profit))}
                </div>
                <div className="summary-label">
                  {insights.profit >= 0 ? 'Profit' : 'Loss'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>📊 Spending by category - {monthLabel(month)}</h2>
            {insights.byCategory.length === 0 && (
              <p>No expenses in this month.</p>
            )}
            {insights.byCategory.map((c) => (
              <div key={c.category} style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  <span>
                    {iconOf(c.category)} {c.category}{' '}
                    <span style={{ color: '#6b7280', fontWeight: 400 }}>
                      ({c.count})
                    </span>
                  </span>
                  <span>
                    {money(c.total)} - {Math.round((c.total / insights.spent) * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    background: '#eceafd',
                    borderRadius: '999px',
                    height: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: (c.total / maxCategory) * 100 + '%',
                      height: '100%',
                      background: '#4f46e5',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>📅 Last 6 months</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', overflowX: 'auto' }}>
              {insights.trend.map((t) => (
                <div
                  key={t.month}
                  style={{ flex: 1, minWidth: '62px', textAlign: 'center' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: '3px',
                      height: '115px',
                    }}
                  >
                    <div
                      title={'Earned ' + money(t.earned)}
                      style={{
                        width: '16px',
                        height: barHeight(t.earned) + 'px',
                        background: '#16a34a',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <div
                      title={'Spent ' + money(t.spent)}
                      style={{
                        width: '16px',
                        height: barHeight(t.spent) + 'px',
                        background: '#ea7a0c',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      fontWeight: t.month === month ? 800 : 400,
                    }}
                  >
                    {monthLabel(t.month, true)}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: t.profit >= 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {t.profit < 0 ? '-' : '+'}
                    {Math.abs(t.profit).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
              <span style={{ color: '#16a34a' }}>■</span> Earned{' '}
              <span style={{ color: '#ea7a0c', marginLeft: '10px' }}>■</span> Spent
              <span style={{ marginLeft: '10px' }}>
                The number under each month is the profit (earned minus spent).
              </span>
            </p>
          </div>
        </>
      )}

      <div className="card">
        <h2>
          🧾 Expenses in {monthLabel(month)} ({expenses.length})
        </h2>

        {loading && <p>Loading expenses...</p>}
        {!loading && !error && expenses.length === 0 && (
          <p>No expenses in this month. Click + Add expense.</p>
        )}

        {expenses.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th>Amount</th>
                  <th>Bill</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((x) => (
                  <tr key={x._id}>
                    <td>{formatDate(x.date)}</td>
                    <td>
                      {iconOf(x.category)} {x.category}
                    </td>
                    <td>{x.note || '-'}</td>
                    <td>{money(x.amount)}</td>
                    <td>
                      {x.hasBill ? (
                        <button
                          className="grey icon-btn"
                          title="View bill picture"
                          onClick={() => openBill(x._id)}
                        >
                          📎
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        className="grey icon-btn"
                        title="Edit"
                        onClick={() => openEdit(x)}
                      >
                        ✏️
                      </button>
                      <button
                        className="danger icon-btn"
                        title="Delete"
                        onClick={() => handleDelete(x)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Expenses