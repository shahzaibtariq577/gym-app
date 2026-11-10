export const API = 'http://localhost:5000/api'

// A member is "Due soon" when the fee is due in this many days or less
export const DUE_SOON_DAYS = 2

export function daysLeft(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

export function getStatus(days) {
  if (days < 0) return 'Late'
  if (days <= DUE_SOON_DAYS) return 'Due soon'
  return 'OK'
}

export function getColor(days) {
  const status = getStatus(days)
  if (status === 'Late') return 'red'
  if (status === 'Due soon') return 'orange'
  return 'green'
}

export function statusLabel(days) {
  if (days < 0) {
    const late = Math.abs(days)
    return 'Late by ' + late + (late === 1 ? ' day' : ' days')
  }
  if (days === 0) return 'Due today'
  if (days <= DUE_SOON_DAYS) {
    return 'Due in ' + days + (days === 1 ? ' day' : ' days')
  }
  return 'OK (' + days + ' days)'
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function whatsappNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '92' + digits.slice(1)
  return digits
}

export function sendReminder(m) {
  const days = daysLeft(m.nextDueDate)
  let text
  if (days < 0) {
    text =
      'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
      ' was due on ' + formatDate(m.nextDueDate) +
      '. Please pay as soon as you can. Thank you!'
  } else {
    text =
      'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
      ' is due on ' + formatDate(m.nextDueDate) +
      ' (' + days + ' days left). Please pay on time. Thank you!'
  }

  const url =
    'https://wa.me/' + whatsappNumber(m.phone) + '?text=' + encodeURIComponent(text)
  window.open(url, '_blank')
}