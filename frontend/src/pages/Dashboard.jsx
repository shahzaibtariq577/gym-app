import { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import PayBox from '../PayBox'
import SettingsContext from '../SettingsContext'
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

function Dashboard({ members, loadMembers }) {
  const { gymName, ownerName, ownerPhoto } = useContext(SettingsContext)
  const [showAll, setShowAll] = useState(false)
  const [summary, setSummary] = useState(null)
  const [insights, setInsights] = useState(null)
  const [bigMember, setBigMember] = useState(null)
  const [payMember, setPayMember] = useState(null)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  function loadSummary() {
    fetch(API + '/payments/summary')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setSummary(data)
      })
      .catch(() => {})
  }

  function loadInsights() {
    fetch(API + '/expenses/insights')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setInsights(data)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadSummary()
    loadInsights()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setBigMember(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  const unpaidMembers = members.filter((m) => m.balance > 0)
  const unpaidTotal = unpaidMembers.reduce((sum, m) => sum + m.balance, 0)

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

  function openPay(m) {
    setMessage('')
    setPayMember(m)
  }

  function handlePaid(text) {
    setPayMember(null)
    setMessage(text)
    loadMembers()
    loadSummary()
    loadInsights()
  }

  return (
    <div>
      {payMember && (
        <PayBox
          member={payMember}
          onClose={() => setPayMember(null)}
          onPaid={handlePaid}
        />
      )}

      {bigMember && bigMember.photo && (
        <div className="photo-modal" onClick={() => setBigMember(null)}>
          <img src={bigMember.photo} alt={bigMember.name} />
          <div className="photo-modal-name">{bigMember.name}</div>
          <div>
            <button
              onClick={() => navigate('/members/' + bigMember._id)}
            >
              View details
            </button>
            <button className="grey" onClick={() => setBigMember(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="topbar">
        <span className="date-pill">📅 {today}</span>
      </div>

      <div
        className="welcome"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/settings"
          title="Open settings"
          style={{ textDecoration: 'none' }}
        >
          {ownerPhoto ? (
            <img
              className="details-photo"
              src={ownerPhoto}
              alt={ownerName || 'Owner'}
              style={{ width: '76px', height: '76px' }}
            />
          ) : (
            <div
              className="details-photo placeholder"
              style={{ width: '76px', height: '76px', fontSize: '30px' }}
            >
              {ownerName ? ownerName.charAt(0).toUpperCase() : '👤'}
            </div>
          )}
        </Link>
        <div>
          <h1>Welcome to {gymName} 👋</h1>
          <p>
            {ownerName ? 'Hello, ' + ownerName + '. ' : ''}Keep going! A
            healthier you is a stronger you.
          </p>
        </div>
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

      {unpaidTotal > 0 && (
        <div className="collect" style={{ borderColor: '#ea7a0c' }}>
          <div className="collect-icon" style={{ background: '#ea7a0c' }}>
            🕒
          </div>
          <div>
            <div className="collect-amount">
              Rs {unpaidTotal.toLocaleString()}
            </div>
            <div className="collect-label">
              Unpaid balance ({unpaidMembers.length}{' '}
              {unpaidMembers.length === 1 ? 'member' : 'members'})
            </div>
          </div>
          <button
            className="grey"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/members')}
          >
            View members →
          </button>
        </div>
      )}

      {insights && (
        <div
          className="collect"
          style={insights.profit < 0 ? { borderColor: '#dc2626' } : {}}
        >
          <div
            className="collect-icon"
            style={insights.profit < 0 ? { background: '#dc2626' } : {}}
          >
            {insights.profit < 0 ? '📉' : '📈'}
          </div>
          <div>
            <div className="collect-amount">
              {insights.profit < 0 ? '-' : ''}Rs{' '}
              {Math.abs(insights.profit).toLocaleString()}
            </div>
            <div className="collect-label">
              {insights.profit < 0 ? 'Loss' : 'Profit'} this month (earned Rs{' '}
              {insights.earned.toLocaleString()}, spent Rs{' '}
              {insights.spent.toLocaleString()})
            </div>
          </div>
          <button
            className="grey"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/expenses')}
          >
            View expenses →
          </button>
        </div>
      )}

      <div className="card">
        <h2>
          📅 Late and due in {DUE_SOON_DAYS} days or less ({urgent.length})
        </h2>

        {message && (
          <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
            {message}
          </p>
        )}

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
                      <td>
                        <div className="member-cell">
                          {m.photo ? (
                            <img
                              className="member-photo"
                              src={m.photo}
                              alt={m.name}
                              title="Click to see big photo"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setBigMember(m)}
                            />
                          ) : (
                            <Link
                              to={'/members/' + m._id}
                              title="View member details"
                              style={{ textDecoration: 'none' }}
                            >
                              <div className="member-photo placeholder">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                            </Link>
                          )}
                          <Link
                            to={'/members/' + m._id}
                            title="View member details"
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {m.name}
                          </Link>
                        </div>
                      </td>
                      <td>{m.phone}</td>
                      <td>
                        Rs {m.fee}
                        {m.balance > 0 && (
                          <div
                            style={{
                              color: '#b91c1c',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            Rs {m.balance.toLocaleString()} left
                          </div>
                        )}
                      </td>
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
                          onClick={() => openPay(m)}
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