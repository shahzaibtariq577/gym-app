import { useState } from 'react'
import {
  API,
  daysLeft,
  getColor,
  getStatus,
  formatDate,
  sendReminder,
} from '../utils'

function Dashboard({ members, loadMembers }) {
  const [showAll, setShowAll] = useState(false)

  const lateCount = members.filter((m) => daysLeft(m.nextDueDate) < 0).length
  const soonCount = members.filter((m) => {
    const d = daysLeft(m.nextDueDate)
    return d >= 0 && d <= 7
  }).length
  const okCount = members.filter((m) => daysLeft(m.nextDueDate) > 7).length

  const urgent = members.filter((m) => daysLeft(m.nextDueDate) <= 2)
  const shown = showAll ? urgent : urgent.slice(0, 3)

  function handleMarkPaid(id, memberName) {
    if (!window.confirm('Mark ' + memberName + ' as paid?')) return

    fetch(API + '/members/' + id + '/pay', { method: 'PUT' })
      .then((res) => res.json())
      .then(() => loadMembers())
  }

  return (
    <div>
      <div className="summary">
        <div className="summary-box red">
          <div className="summary-number">{lateCount}</div>
          <div>Late</div>
        </div>
        <div className="summary-box orange">
          <div className="summary-number">{soonCount}</div>
          <div>Due soon</div>
        </div>
        <div className="summary-box green">
          <div className="summary-number">{okCount}</div>
          <div>OK</div>
        </div>
        <div className="summary-box blue">
          <div className="summary-number">{members.length}</div>
          <div>Total members</div>
        </div>
      </div>

      <div className="card">
        <h2>Fees due in 2 days or less ({urgent.length})</h2>

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
                          {getStatus(days)} ({days} days)
                        </span>
                      </td>
                      <td>
                        <button
                          className="green"
                          onClick={() => sendReminder(m)}
                        >
                          Send reminder
                        </button>
                        <button onClick={() => handleMarkPaid(m._id, m.name)}>
                          Mark as paid
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