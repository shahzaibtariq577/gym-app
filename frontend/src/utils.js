export const API = 'http://localhost:5000/api'

export function daysLeft(dueDate) {
  const today = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

export function getColor(days) {
  if (days < 0) return 'red'
  if (days <= 7) return 'orange'
  return 'green'
}

export function getStatus(days) {
  if (days < 0) return 'Late'
  if (days <= 7) return 'Due soon'
  return 'OK'
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