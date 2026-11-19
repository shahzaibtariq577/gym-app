import { openWhatsApp } from './utils'

async function makePdf(element) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc) => {
      const copy = clonedDoc.querySelector('[data-receipt="1"]')
      let parent = copy ? copy.parentElement : null
      while (parent && parent !== clonedDoc.body) {
        parent.style.position = 'static'
        parent.style.overflow = 'visible'
        parent.style.height = 'auto'
        parent.style.display = 'block'
        parent.style.background = 'transparent'
        parent = parent.parentElement
      }
    },
  })

  const width = 100
  const height = (canvas.height * width) / canvas.width
  const pdf = new jsPDF({
    unit: 'mm',
    format: [width, height],
    orientation: 'portrait',
  })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height)
  return pdf.output('blob')
}

function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function receiptLink(shareUrl) {
  try {
    const res = await fetch(shareUrl, { method: 'POST' })
    const data = await res.json()
    if (data.token) return window.location.origin + '/r/' + data.token
  } catch (err) {
    return ''
  }
  return ''
}

export async function saveReceiptPdf(element, fileName) {
  const blob = await makePdf(element)
  downloadFile(blob, fileName)
}

export async function sendReceiptPdf(element, fileName, phone, text) {
  const blob = await makePdf(element)
  const file = new File([blob], fileName, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName, text: text })
      return ''
    } catch (err) {
      if (err && err.name === 'AbortError') return ''
    }
  }

  downloadFile(blob, fileName)
  openWhatsApp(phone, text)
  return 'The PDF was saved in your Downloads folder. In WhatsApp, press the 📎 button and attach it.'
}