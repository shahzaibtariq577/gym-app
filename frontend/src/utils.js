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
  } else if (days === 0) {
    text =
      'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
      ' is due today. Please pay on time. Thank you!'
  } else {
    text =
      'Hello ' + m.name + ', your gym fee of Rs ' + m.fee +
      ' is due on ' + formatDate(m.nextDueDate) +
      ' (' + days + (days === 1 ? ' day' : ' days') +
      ' left). Please pay on time. Thank you!'
  }

  const url =
    'https://wa.me/' + whatsappNumber(m.phone) + '?text=' + encodeURIComponent(text)
  window.open(url, '_blank')
}

// Take a picture file, cut a square from the middle, make it 200x200,
// and give back a small JPEG text that can be saved in the database
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the photo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('This file is not a picture'))
      img.onload = () => {
        const size = 200
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2

        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}