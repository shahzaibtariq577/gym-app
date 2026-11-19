import { useState, useEffect } from 'react'
import {
  daysLeft,
  getColor,
  statusLabel,
  sendReminder,
  validPhone,
} from './utils'

const KEY = 'gymRemindedToday'

function dayText() {
  return new Date().toLocaleDateString('en-CA')
}

function readOpened() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    return saved.day === dayText() && Array.isArray(saved.ids) ? saved.ids : []
  } catch (err) {
    return []
  }
}

function writeOpened(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: dayText(), ids: ids }))
  } catch (err) {
    return
  }
}

function ReminderBox({ members, onClose }) {
  const [opened, setOpened] = useState(readOpened)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function send(m) {
    sendReminder(m)
    if (!opened.includes(m._id)) {
      const next = [...opened, m._id]
      setOpened(next)
      writeOpened(next)
    }
  }

  const waiting = members.filter(
    (m) => validPhone(m.phone) && !opened.includes(m._id)
  )
  const next = waiting[0]

  return (
    <div className="photo-modal" style={{ cursor: 'default' }}>
      <div
        className="card"
        style={{
          width: 'min(94vw, 460px)',
          maxHeight: '86vh',
          overflowY: 'auto',
          cursor: 'default',
          marginBottom: 0,
        }}
      >
        <h2>💬 Send reminders</h2>
        <p style={{ margin: '0 0 12px' }}>
          WhatsApp opens for one member at a time. Press Send inside WhatsApp.
          Nothing is sent without your click.
        </p>

        <button
          disabled={!next}
          style={!next ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          onClick={() => send(next)}
        >
          {next ? '💬 Send next: ' + next.name : '✅ All reminders opened'}
        </button>

        <div style={{ marginTop: '12px' }}>
          {members.map((m) => {
            const days = daysLeft(m.nextDueDate)
            const hasPhone = validPhone(m.phone)
            const done = opened.includes(m._id)
            return (
              <div
                key={m._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom: '1px solid #e0e3ee',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{m.name}</div>
                  <span className={'badge ' + getColor(days)}>
                    {statusLabel(days)}
                  </span>
                </div>
                {hasPhone ? (
                  <button
                    className={done ? 'grey' : 'green'}
                    title="Open WhatsApp"
                    onClick={() => send(m)}
                  >
                    {done ? '✓ Opened' : '💬 Send'}
                  </button>
                ) : (
                  <span style={{ color: '#b91c1c', fontSize: '12px' }}>
                    No phone
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '12px' }}>
          <button className="grey" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReminderBox