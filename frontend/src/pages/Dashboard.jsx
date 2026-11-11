import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  API,
  DUE_SOON_DAYS,
  daysLeft,
  getColor,
  getStatus,
  statusLabel,
  formatDate,
  sendReminder,
} from '../utils'

function Dashboard({ gymName, members, loadMembers }) {
  const [showAll, setShowAll] = useState(false)
  const [summary, setSummary] = useState(null)
  const navigate = useNavigate()

  function loadSummary() {
    fetch(API + '/payments/summary')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setSummary(data)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const lateCount = members.filter(
    (m) => getStatus(daysLeft(m.nextDueDate)) === 'Late'
  ).length
  const soonCount = members.filter(
    (m) => getStatus(daysLeft(m.nextDueDate)) === 'Due soon'
  ).length
  const okCount = members.filter(
    (m) => getStatus(daysLeft(m.nextDueDate)) === 'OK'
  ).length

  const urgent = members.filter(
    (m) => getStatus(daysLeft(m.nextDueDate)) !== 'OK'
  )
  const shown = showAll ? urgent : urgent.slice(0, 3)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  function handleMarkPaid(id, memberName) {
    if (!window.confirm('Mark ' + memberName + ' as paid?')) return

    fetch(API + '/members/' + id + '/pay', { method: 'PUT' })
      .then((res) => res.json())
      .then(() => {
        loadMembers()
        loadSummary()
      })
  }

  return (
    <div>
      <div className="topbar">
        <span className="date-pill">📅 {today}</span>
      </div>

      <div className="welcome">
        <h1>Welcome to {gymName} 👋</h1>
        <p>Keep going! A healthier you is a stronger you.</p>
      </div>

      <div className="summary">
        <div
          className="summary-box red clickable"
          onClick={() => navigate('/members?status=late')}
        >
          <div className="summary-icon">⏰</div>
          <div>
            <div className="summary-number">{lateCount}</div>
            <div className="summary-label">Late</div>
          </div>
          <span className="summary-view">View →</span>
        </div>
        <div
          className="summary-box orange clickable"
          onClick={() => navigate('/members?status=soon')}
        >
          <div className="summary-icon">⏳</div>
          <div>
            <div className="summary-number">{soonCount}</div>
            <div className="summary-label">Due soon</div>
          </div>
          <span className="summary-view">View →</span>
        </div>
        <div
          className="summary-box green clickable"
          onClick={() => navigate('/members?status=ok')}
        >
          <div className="summary-icon">✅</div>
          <div>
            <div className="summary-number">{okCount}</div>
            <div className="summary-label">OK</div>
          </div>
          <span className="summary-view">View →</span>
        </div>
        <div
          className="summary-box blue clickable"
          onClick={() => navigate('/members')}
        >
          <div className="summary-icon">👥</div>
          <div>
            <div className="summary-number">{members.length}</div>
            <div className="summary-label">Total members</div>
          </div>
          <span className="summary-view">View →</span>
        </div>
      </div>

      <div className="collect">
        <div className="collect-icon">💰</div>
        <div>
          <div className="collect-amount">
            Rs {summary ? summary.total.toLocaleString() : '0'}
          </div>
          <div className="collect-label">
            Collected {summary ? 'in ' + summary.month : 'this month'}
            {summary
              ? ' (' +
                summary.count +
                (summary.count === 1 ? ' payment)' : ' payments)')
              : ''}
          </div>
        </div>
        <button
          className="grey"
          style={{ marginLeft: 'auto' }}
          onClick={() => navigate('/payments')}
        >
          View history →
        </button>
      </div>

      <div className="card">
        <h2>
          📅 Late and due in {DUE_SOON_DAYS} days or less ({urgent.length})
        </h2>

        {urgent.length === 0 && <p>No urgent fees. Everything is fine.</p>}

        {shown.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Fee</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => {
                  const days = daysLeft(m.nextDueDate)
                  return (
                    <tr key={m._id}>
                      <td>{m.name}</td>
                      <td>{m.phone}</td>
                      <td>Rs {m.fee}</td>
                      <td>{formatDate(m.nextDueDate)}</td>
                      <td>
                        <span className={'badge ' + getColor(days)}>
                          {statusLabel(days)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="green icon-btn"
                          title="Send reminder"
                          onClick={() => sendReminder(m)}
                        >
                          💬
                        </button>
                        <button
                          className="icon-btn"
                          title="Mark as paid"
                          onClick={() => handleMarkPaid(m._id, m.name)}
                        >
                          ✅
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {urgent.length > 3 && (
          <button onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show less' : 'Show more (' + (urgent.length - 3) + ')'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Dashboard