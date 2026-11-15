import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, formatDate, resizePhoto } from '../utils'
import ShopSlip from '../ShopSlip'

function money(number) {
  return 'Rs ' + Number(number).toLocaleString()
}

function pad(number) {
  return String(number).padStart(2, '0')
}

function monthText(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1)
}

function monthLabel(text) {
  const parts = text.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString(
    'en-GB',
    { month: 'long', year: 'numeric' }
  )
}

function shiftMonth(text, step) {
  const parts = text.split('-')
  return monthText(new Date(Number(parts[0]), Number(parts[1]) - 1 + step, 1))
}

function timeOf(date) {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function stockBadge(stock, limit) {
  if (stock <= 0) return { color: 'red', text: 'Out of stock' }
  if (stock <= limit) return { color: 'orange', text: stock + ' left (low)' }
  return { color: 'green', text: stock + ' in stock' }
}

const METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank']
const MAX_SLIP_TEXT = 300000
const SLIP_MAX_SIDE = 800
const SLIP_QUALITY = 0.55

function resizeSlip(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the slip'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('This file is not a picture'))
      img.onload = () => {
        const scale = Math.min(1, SLIP_MAX_SIDE / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', SLIP_QUALITY))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function statusColor(status) {
  if (status === 'Paid') return 'green'
  if (status === 'Part paid') return 'orange'
  return 'red'
}

function PictureField({ title, value, buttonText, onPick, onRemove }) {
  return (
    <div style={{ marginTop: '10px' }}>
      <span className="photo-title">{title}</span>
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
          📎 {value ? 'Replace ' + buttonText : 'Choose ' + buttonText}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onPick}
          />
        </label>
        {value && (
          <>
            <img
              src={value}
              alt={buttonText}
              style={{
                width: 'auto',
                height: '60px',
                maxWidth: '100px',
                objectFit: 'contain',
                borderRadius: '6px',
                border: '1px solid #e0e3ee',
              }}
            />
            <button type="button" className="grey" onClick={onRemove}>
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Shop() {
  const thisMonth = monthText(new Date())
  const [month, setMonth] = useState(thisMonth)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stock, setStock] = useState('')
  const [photo, setPhoto] = useState(null)
  const [hadPhoto, setHadPhoto] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [sellProduct, setSellProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [buyer, setBuyer] = useState('')
  const [note, setNote] = useState('')
  const [sellError, setSellError] = useState('')
  const [selling, setSelling] = useState(false)
  const [method, setMethod] = useState('Cash')
  const [slip, setSlip] = useState('')
  const [slipSale, setSlipSale] = useState(null)
  const [paidNow, setPaidNow] = useState('')
  const [paidTouched, setPaidTouched] = useState(false)

  const [purchases, setPurchases] = useState([])
  const [pMonth, setPMonth] = useState(thisMonth)
  const [buyProduct, setBuyProduct] = useState(null)
  const [buyQty, setBuyQty] = useState('')
  const [buyCost, setBuyCost] = useState('')
  const [buySupplier, setBuySupplier] = useState('')
  const [buyNote, setBuyNote] = useState('')
  const [buyBill, setBuyBill] = useState('')
  const [buyError, setBuyError] = useState('')
  const [buying, setBuying] = useState(false)

  const [collectSale, setCollectSale] = useState(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectMethod, setCollectMethod] = useState('Cash')
  const [collectSlip, setCollectSlip] = useState('')
  const [collectError, setCollectError] = useState('')
  const [collecting, setCollecting] = useState(false)

  const [viewImage, setViewImage] = useState(null)

  const [bigProduct, setBigProduct] = useState(null)
  const navigate = useNavigate()

  const lowLimit = summary ? summary.lowStockLimit : 5

  function loadAll(m) {
    setError('')
    return Promise.all([
      fetch(API + '/shop/products').then((res) => res.json()),
      fetch(API + '/shop/sales?month=' + m).then((res) => res.json()),
      fetch(API + '/shop/summary?month=' + m).then((res) => res.json()),
    ])
      .then(([productList, saleList, sum]) => {
        if (Array.isArray(productList) && Array.isArray(saleList) && !sum.error) {
          setProducts(productList)
          setSales(saleList)
          setSummary(sum)
        } else {
          setError(
            (productList && productList.error) ||
              (saleList && saleList.error) ||
              (sum && sum.error) ||
              'Could not load the shop'
          )
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load the shop. Is the backend running?')
        setLoading(false)
      })
  }

  function loadPurchases(m) {
    return fetch(API + '/shop/purchases?month=' + m)
      .then((res) => res.json())
      .then((list) => {
        if (Array.isArray(list)) setPurchases(list)
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    loadAll(month)
  }, [month])

  useEffect(() => {
    loadPurchases(pMonth)
  }, [pMonth])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setBigProduct(null)
        setViewImage(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openAdd() {
    setEditingId('')
    setName('')
    setSalePrice('')
    setCostPrice('')
    setStock('')
    setPhoto(null)
    setHadPhoto(false)
    setFormError('')
    setMessage('')
    setSellProduct(null)
    setBuyProduct(null)
    setCollectSale(null)
    setShowForm(true)
  }

  function openEdit(p) {
    setEditingId(p._id)
    setName(p.name)
    setSalePrice(String(p.salePrice))
    setCostPrice(p.costPrice ? String(p.costPrice) : '')
    setStock(String(p.stock))
    setPhoto(null)
    setHadPhoto(!!p.photo)
    setFormError('')
    setMessage('')
    setSellProduct(null)
    setBuyProduct(null)
    setCollectSale(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId('')
    setFormError('')
  }

  function handlePhotoFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('Error: Please choose a picture file (JPG or PNG)')
      return
    }
    setFormError('')
    resizePhoto(file)
      .then((text) => setPhoto(text))
      .catch((err) => setFormError('Error: ' + err.message))
  }

  function handleSaveProduct(e) {
    e.preventDefault()
    if (saving) return

    if (!name.trim()) {
      setFormError('Error: Please write the product name')
      return
    }
    if (!(Number(salePrice) > 0)) {
      setFormError('Error: Sale price must be more than 0')
      return
    }
    if (!(Number(costPrice) > 0)) {
      setFormError('Error: Buying price must be more than 0')
      return
    }
    if (stock !== '' && !Number.isInteger(Number(stock))) {
      setFormError('Error: Stock must be a whole number')
      return
    }

    setFormError('')
    setSaving(true)

    const body = {
      name: name.trim(),
      salePrice: Number(salePrice),
      costPrice: Number(costPrice),
      stock: stock === '' ? 0 : Number(stock),
    }
    if (photo !== null) body.photo = photo

    fetch(editingId ? API + '/shop/products/' + editingId : API + '/shop/products', {
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
          setMessage(editingId ? 'Product updated' : 'Product added')
          loadAll(month)
        }
      })
      .catch(() => {
        setSaving(false)
        setFormError('Error: Could not reach the backend')
      })
  }

  function handleDeleteProduct(p) {
    const ok = window.confirm(
      'Delete the product ' + p.name + '? Its old sales stay in the sales list.'
    )
    if (!ok) return
    setMessage('')

    fetch(API + '/shop/products/' + p._id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Product deleted')
          if (sellProduct && sellProduct._id === p._id) setSellProduct(null)
          loadAll(month)
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  function openSell(p) {
    setSellProduct(p)
    setQuantity('1')
    setUnitPrice(String(p.salePrice))
    setBuyer('')
    setNote('')
    setMethod('Cash')
    setSlip('')
    setSellError('')
    setMessage('')
    setPaidNow('')
    setPaidTouched(false)
    setBuyProduct(null)
    setCollectSale(null)
    setShowForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function pickImage(e, setter, setErr) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('Error: Please choose a picture file (JPG or PNG)')
      return
    }
    setErr('')
    resizeSlip(file)
      .then((text) => {
        if (text.length > MAX_SLIP_TEXT) {
          setErr('Error: This picture is too big. Try a smaller one.')
        } else {
          setter(text)
        }
      })
      .catch((err) => setErr('Error: ' + err.message))
  }

  function openBuy(p) {
    setBuyProduct(p)
    setBuyQty('')
    setBuyCost(p.costPrice > 0 ? String(p.costPrice) : '')
    setBuySupplier('')
    setBuyNote('')
    setBuyBill('')
    setBuyError('')
    setMessage('')
    setShowForm(false)
    setSellProduct(null)
    setCollectSale(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBuy(e) {
    e.preventDefault()
    if (buying) return

    const qty = Number(buyQty)
    if (!Number.isInteger(qty) || qty < 1) {
      setBuyError('Error: Quantity must be a whole number, 1 or more')
      return
    }
    if (!(Number(buyCost) > 0)) {
      setBuyError('Error: Buying price must be more than 0')
      return
    }

    setBuyError('')
    setBuying(true)

    fetch(API + '/shop/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: buyProduct._id,
        quantity: qty,
        unitCost: Number(buyCost),
        supplier: buySupplier,
        note: buyNote,
        billImage: buyBill,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setBuying(false)
        if (data.error) {
          setBuyError('Error: ' + data.error)
        } else {
          setMessage(
            'Bought ' + qty + ' x ' + data.productName + ' for ' + money(data.total) +
              '. Stock is now ' + data.newStock + ', buying price ' + money(data.newCostPrice)
          )
          setBuyProduct(null)
          loadAll(month)
          if (pMonth !== thisMonth) setPMonth(thisMonth)
          else loadPurchases(pMonth)
        }
      })
      .catch(() => {
        setBuying(false)
        setBuyError('Error: Could not reach the backend')
      })
  }

  function handleUndoPurchase(pu) {
    const ok = window.confirm(
      'Remove the purchase of ' + pu.quantity + ' x ' + pu.productName + ' (' + money(pu.total) +
        ')? The stock and the buying price go back, and its expense is deleted.'
    )
    if (!ok) return
    setMessage('')

    fetch(API + '/shop/purchases/' + pu._id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Purchase removed')
          loadAll(month)
          loadPurchases(pMonth)
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  function openBill(pu) {
    fetch(API + '/shop/purchases/' + pu._id + '/bill')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setMessage('Error: ' + data.error)
        else setViewImage({ src: data.bill, name: 'Bill - ' + pu.productName })
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  function openCollect(sale) {
    setCollectSale(sale)
    setCollectAmount(String(sale.balance))
    setCollectMethod('Cash')
    setCollectSlip('')
    setCollectError('')
    setMessage('')
    setShowForm(false)
    setSellProduct(null)
    setBuyProduct(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCollect(e) {
    e.preventDefault()
    if (collecting) return

    const amount = Number(collectAmount)
    if (!(amount > 0)) {
      setCollectError('Error: Amount must be more than 0')
      return
    }
    if (amount > collectSale.balance) {
      setCollectError('Error: The customer only owes ' + money(collectSale.balance))
      return
    }

    setCollectError('')
    setCollecting(true)

    fetch(API + '/shop/sales/' + collectSale._id + '/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        method: collectMethod,
        slipImage: collectMethod === 'Cash' ? '' : collectSlip,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCollecting(false)
        if (data.error) {
          setCollectError('Error: ' + data.error)
        } else {
          setMessage(
            'Collected ' + money(amount) + (data.buyer ? ' from ' + data.buyer : '') +
              (data.balance > 0 ? '. Still owes ' + money(data.balance) : '. Fully paid')
          )
          setCollectSale(null)
          setSlipSale(data)
          loadAll(month)
        }
      })
      .catch(() => {
        setCollecting(false)
        setCollectError('Error: Could not reach the backend')
      })
  }

  function changeMethod(value) {
    setMethod(value)
    if (value === 'Cash') setSlip('')
  }

  function handleSlipFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSellError('Error: Please choose a picture file (JPG or PNG)')
      return
    }
    setSellError('')
    resizeSlip(file)
      .then((text) => {
        if (text.length > MAX_SLIP_TEXT) {
          setSellError('Error: This picture is too big. Try a smaller one.')
        } else {
          setSlip(text)
        }
      })
      .catch((err) => setSellError('Error: ' + err.message))
  }

  function handleSell(e) {
    e.preventDefault()
    if (selling) return

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      setSellError('Error: Quantity must be a whole number, 1 or more')
      return
    }
    if (qty > sellProduct.stock) {
      setSellError('Error: Only ' + sellProduct.stock + ' in stock')
      return
    }
    if (!(Number(unitPrice) > 0)) {
      setSellError('Error: Price must be more than 0')
      return
    }

    const fullTotal = Math.round(qty * Number(unitPrice) * 100) / 100
    if (paidTouched && paidNow === '') {
      setSellError('Error: Please write the amount paid now (0 if nothing)')
      return
    }
    const paid = paidTouched ? Math.round(Number(paidNow) * 100) / 100 : fullTotal
    if (!(paid >= 0) || paid > fullTotal) {
      setSellError('Error: Amount paid must be from 0 to ' + money(fullTotal))
      return
    }
    if (paid < fullTotal && !buyer.trim()) {
      setSellError('Error: Please write the buyer name when the customer pays less')
      return
    }

    setSellError('')
    setSelling(true)

    fetch(API + '/shop/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: sellProduct._id,
        quantity: qty,
        unitPrice: Number(unitPrice),
        buyer: buyer,
        note: note,
        amountPaid: paid,
        method: paid > 0 ? method : 'Cash',
        slipImage: paid > 0 && method !== 'Cash' ? slip : '',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSelling(false)
        if (data.error) {
          setSellError('Error: ' + data.error)
        } else {
          setMessage(
            'Sold ' + qty + ' x ' + data.productName + ' for ' + money(data.total) +
              (data.balance > 0 ? '. Customer owes ' + money(data.balance) : '')
          )
          setSellProduct(null)
          setSlipSale(data)
          if (month !== thisMonth) setMonth(thisMonth)
          else loadAll(month)
        }
      })
      .catch(() => {
        setSelling(false)
        setSellError('Error: Could not reach the backend')
      })
  }

  function handleUndoSale(s) {
    const ok = window.confirm(
      'Remove the sale of ' + s.quantity + ' x ' + s.productName + ' (' + money(s.total) + ')? The stock is added back and its payments are removed.'
    )
    if (!ok) return
    setMessage('')

    fetch(API + '/shop/sales/' + s._id, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage('Error: ' + data.error)
        } else {
          setMessage('Sale removed and stock added back')
          loadAll(month)
        }
      })
      .catch(() => setMessage('Error: Could not reach the backend'))
  }

  const maxSold =
    summary && summary.byProduct.length > 0
      ? Math.max(...summary.byProduct.map((p) => p.quantity))
      : 1
  const sellTotal = sellProduct ? Number(quantity) * Number(unitPrice) : 0
  const paidAmount = paidTouched ? Number(paidNow) : sellTotal
  const stillOwes = sellTotal > 0 && paidAmount >= 0 ? sellTotal - paidAmount : 0

  const buyQtyNumber = Number(buyQty)
  const buyCostNumber = Number(buyCost)
  const buyValid =
    !!buyProduct && Number.isInteger(buyQtyNumber) && buyQtyNumber >= 1 && buyCostNumber > 0
  const buyTotal = buyValid ? buyQtyNumber * buyCostNumber : 0
  const oldStock = buyProduct ? buyProduct.stock : 0
  const oldCost = buyProduct ? buyProduct.costPrice || 0 : 0
  const newAverage = buyValid
    ? oldStock > 0 && oldCost > 0
      ? Math.round(
          ((oldStock * oldCost + buyQtyNumber * buyCostNumber) /
            (oldStock + buyQtyNumber)) * 100
        ) / 100
      : buyCostNumber
    : 0

  return (
    <div>
      {bigProduct && (
        <div className="photo-modal" onClick={() => setBigProduct(null)}>
          <img src={bigProduct.photo} alt={bigProduct.name} />
          <div className="photo-modal-name">{bigProduct.name}</div>
          <div>
            <button className="grey" onClick={() => setBigProduct(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="photo-modal" onClick={() => setViewImage(null)}>
          <img src={viewImage.src} alt={viewImage.name} />
          <div className="photo-modal-name">{viewImage.name}</div>
          <div>
            <button className="grey" onClick={() => setViewImage(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {slipSale && (
        <ShopSlip sale={slipSale} onClose={() => setSlipSale(null)} />
      )}

      <h1 className="page-title">Shop</h1>

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
          {showForm ? 'Close' : '+ Add product'}
        </button>
      </div>

      {message && (
        <p className={message.startsWith('Error') ? 'msg-error' : 'msg-ok'}>
          {message}
        </p>
      )}
      {error && <p className="msg-error">Error: {error}</p>}

      {sellProduct && (
        <div className="card">
          <h2>🛒 Sell {sellProduct.name}</h2>
          <p>
            {money(sellProduct.salePrice)} each, {sellProduct.stock} in stock
          </p>
          <form onSubmit={handleSell}>
            <div className="form-grid">
              <label className="form-field">
                Quantity *
                <input
                  type="number"
                  min="1"
                  max={sellProduct.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <label className="form-field">
                Price each (Rs) *
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </label>
              <label className="form-field">
                Buyer name (optional)
                <input
                  maxLength={60}
                  placeholder="e.g. Ali"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                />
              </label>
              <label className="form-field">
                Note (optional)
                <input
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            <div className="form-grid" style={{ marginTop: '12px' }}>
              <label className="form-field">
                Amount paid now (Rs)
                <input
                  type="number"
                  min="0"
                  value={
                    paidTouched
                      ? paidNow
                      : sellTotal > 0
                        ? String(sellTotal)
                        : ''
                  }
                  onChange={(e) => {
                    setPaidTouched(true)
                    setPaidNow(e.target.value)
                  }}
                />
              </label>
              {paidAmount > 0 && (
                <label className="form-field">
                  Paid by
                  <select
                    value={method}
                    onChange={(e) => changeMethod(e.target.value)}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {paidAmount > 0 && method !== 'Cash' && (
              <PictureField
                title="Payment screenshot (optional)"
                value={slip}
                buttonText="screenshot"
                onPick={handleSlipFile}
                onRemove={() => setSlip('')}
              />
            )}

            <p style={{ marginTop: '12px', fontWeight: 700 }}>
              Total: {money(sellTotal > 0 ? sellTotal : 0)}
            </p>
            {stillOwes > 0 && (
              <p className="info-note">
                The customer will owe {money(stillOwes)}. Please write the buyer
                name. You can collect the rest later with the Collect button.
              </p>
            )}

            {sellError && <p className="msg-error">{sellError}</p>}

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                disabled={selling}
                style={selling ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {selling ? 'Saving...' : 'Save sale'}
              </button>
              <button
                type="button"
                className="grey"
                onClick={() => setSellProduct(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {buyProduct && (
        <div className="card">
          <h2>📥 Buy stock: {buyProduct.name}</h2>
          <p>
            {buyProduct.stock} in stock now
            {buyProduct.costPrice > 0
              ? ', buying price ' + money(buyProduct.costPrice)
              : ''}
          </p>
          <form onSubmit={handleBuy}>
            <div className="form-grid">
              <label className="form-field">
                Quantity bought *
                <input
                  type="number"
                  min="1"
                  value={buyQty}
                  onChange={(e) => setBuyQty(e.target.value)}
                />
              </label>
              <label className="form-field">
                Buying price each (Rs) *
                <input
                  type="number"
                  value={buyCost}
                  onChange={(e) => setBuyCost(e.target.value)}
                />
              </label>
              <label className="form-field">
                Supplier (optional)
                <input
                  maxLength={60}
                  value={buySupplier}
                  onChange={(e) => setBuySupplier(e.target.value)}
                />
              </label>
              <label className="form-field">
                Note (optional)
                <input
                  maxLength={200}
                  value={buyNote}
                  onChange={(e) => setBuyNote(e.target.value)}
                />
              </label>
            </div>

            <PictureField
              title="Bill picture (optional)"
              value={buyBill}
              buttonText="bill"
              onPick={(e) => pickImage(e, setBuyBill, setBuyError)}
              onRemove={() => setBuyBill('')}
            />

            {buyValid && (
              <>
                <p style={{ marginTop: '12px', fontWeight: 700 }}>
                  Total: {money(buyTotal)}
                </p>
                <p className="info-note">
                  Stock will be {oldStock + buyQtyNumber}. New buying price will
                  be {money(newAverage)} (average). A Supplements expense of{' '}
                  {money(buyTotal)} is added for you.
                </p>
              </>
            )}

            {buyError && <p className="msg-error">{buyError}</p>}

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                disabled={buying}
                style={buying ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {buying ? 'Saving...' : 'Save purchase'}
              </button>
              <button
                type="button"
                className="grey"
                onClick={() => setBuyProduct(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {collectSale && (
        <div className="card">
          <h2>💵 Collect money</h2>
          <p>
            {collectSale.buyer || 'Customer'} bought {collectSale.quantity} x{' '}
            {collectSale.productName} for {money(collectSale.total)}. Paid{' '}
            {money(collectSale.amountPaid)}, owes {money(collectSale.balance)}.
          </p>
          <form onSubmit={handleCollect}>
            <div className="form-grid">
              <label className="form-field">
                Amount received (Rs) *
                <input
                  type="number"
                  min="1"
                  max={collectSale.balance}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </label>
              <label className="form-field">
                Paid by
                <select
                  value={collectMethod}
                  onChange={(e) => {
                    setCollectMethod(e.target.value)
                    if (e.target.value === 'Cash') setCollectSlip('')
                  }}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {collectMethod !== 'Cash' && (
              <PictureField
                title="Payment screenshot (optional)"
                value={collectSlip}
                buttonText="screenshot"
                onPick={(e) => pickImage(e, setCollectSlip, setCollectError)}
                onRemove={() => setCollectSlip('')}
              />
            )}

            {collectError && <p className="msg-error">{collectError}</p>}

            <div style={{ marginTop: '10px' }}>
              <button
                type="submit"
                disabled={collecting}
                style={collecting ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {collecting ? 'Saving...' : 'Save payment'}
              </button>
              <button
                type="button"
                className="grey"
                onClick={() => setCollectSale(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2>{editingId ? '✏️ Edit product' : '📦 Add product'}</h2>
          <form onSubmit={handleSaveProduct}>
            <div className="form-grid">
              <label className="form-field">
                Product name *
                <input
                  maxLength={60}
                  placeholder="e.g. Whey Protein 1kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="form-field">
                Sale price (Rs) *
                <input
                  type="number"
                  placeholder="9000"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </label>
              <label className="form-field">
                Buying price (Rs) *
                <input
                  type="number"
                  placeholder="7000"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </label>
              <label className="form-field">
                Stock available
                <input
                  type="number"
                  placeholder="10"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </label>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span className="photo-title">Product picture (optional)</span>
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
                  📎 {hadPhoto || photo ? 'Replace picture' : 'Choose picture'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoFile}
                  />
                </label>
                {photo && (
                  <img
                    src={photo}
                    alt="Product"
                    style={{
                      height: '60px',
                      width: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #e0e3ee',
                    }}
                  />
                )}
                {!photo && hadPhoto && photo === null && (
                  <span className="photo-title">A picture is saved</span>
                )}
                {(photo || (hadPhoto && photo === null)) && (
                  <button type="button" className="grey" onClick={() => setPhoto('')}>
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
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save product'}
              </button>
              <button type="button" className="grey" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {summary && summary.noCostCount > 0 && (
        <p className="msg-error">
          {summary.noCostCount}{' '}
          {summary.noCostCount === 1 ? 'product has' : 'products have'} no buying
          price, so the profit looks too high. Click ✏️ on{' '}
          {summary.noCostCount === 1 ? 'it' : 'them'} and add the buying price.
        </p>
      )}

      {summary && (
        <>
          <div className="summary">
            <div className="summary-box green">
              <div className="summary-icon">💰</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(summary.total)}
                </div>
                <div className="summary-label">
                  Shop earned ({summary.saleCount}{' '}
                  {summary.saleCount === 1 ? 'sale' : 'sales'})
                </div>
              </div>
            </div>
            <div className={'summary-box ' + (summary.profit >= 0 ? 'blue' : 'red')}>
              <div className="summary-icon">{summary.profit >= 0 ? '📈' : '📉'}</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {summary.profit < 0 ? '-' : ''}
                  {money(Math.abs(summary.profit))}
                </div>
                <div className="summary-label">
                  Shop {summary.profit >= 0 ? 'profit' : 'loss'} (sale price minus
                  buying price)
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  Cost of sold items: {money(summary.cost)}
                </div>
              </div>
            </div>
            <div className="summary-box blue">
              <div className="summary-icon">🏬</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(summary.stockValue)}
                </div>
                <div className="summary-label">
                  Stock value ({summary.stockUnits}{' '}
                  {summary.stockUnits === 1 ? 'unit' : 'units'} on the shelf)
                </div>
              </div>
            </div>
          </div>
          <div className="summary">
            <div
              className="summary-box orange clickable"
              onClick={() => navigate('/expenses')}
            >
              <div className="summary-icon">🧾</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(summary.spent)}
                </div>
                <div className="summary-label">
                  Stock bought ({summary.spentCount}{' '}
                  {summary.spentCount === 1 ? 'expense' : 'expenses'})
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  Not a cost until the items are sold
                </div>
              </div>
              <span className="summary-view">View →</span>
            </div>
            <div className="summary-box orange">
              <div className="summary-icon">🧴</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {summary.itemsSold}
                </div>
                <div className="summary-label">
                  Items sold ({summary.saleCount}{' '}
                  {summary.saleCount === 1 ? 'sale' : 'sales'})
                </div>
              </div>
            </div>
            <div className={'summary-box ' + (summary.owed > 0 ? 'red' : 'green')}>
              <div className="summary-icon">🕒</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {money(summary.owed)}
                </div>
                <div className="summary-label">
                  Customers owe ({summary.owedCount}{' '}
                  {summary.owedCount === 1 ? 'sale' : 'sales'})
                </div>
              </div>
            </div>
            <div className={'summary-box ' + (summary.lowStock > 0 ? 'red' : 'green')}>
              <div className="summary-icon">📦</div>
              <div>
                <div className="summary-number" style={{ fontSize: '24px' }}>
                  {summary.lowStock}
                </div>
                <div className="summary-label">
                  Low or out of stock ({summary.lowStockLimit} or less)
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>📦 Products ({products.length})</h2>

        {loading && <p>Loading shop...</p>}
        {!loading && !error && products.length === 0 && (
          <p>No products yet. Click + Add product.</p>
        )}

        {products.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sale price</th>
                  <th>Buying price</th>
                  <th>Stock</th>
                  <th>Stock value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const badge = stockBadge(p.stock, lowLimit)
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="member-cell">
                          {p.photo ? (
                            <img
                              className="member-photo"
                              src={p.photo}
                              alt={p.name}
                              title="Click to see big picture"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setBigProduct(p)}
                            />
                          ) : (
                            <div className="member-photo placeholder">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {p.name}
                        </div>
                      </td>
                      <td>{money(p.salePrice)}</td>
                      <td>{p.costPrice > 0 ? money(p.costPrice) : '-'}</td>
                      <td>
                        <span className={'badge ' + badge.color}>{badge.text}</span>
                      </td>
                      <td>{p.costPrice > 0 ? money(p.stock * p.costPrice) : '-'}</td>
                      <td>
                        <button
                          className="icon-btn"
                          title="Buy stock"
                          onClick={() => openBuy(p)}
                        >
                          📥
                        </button>
                        <button
                          className="green icon-btn"
                          title={p.stock > 0 ? 'Sell' : 'Out of stock'}
                          disabled={p.stock <= 0}
                          style={p.stock <= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                          onClick={() => openSell(p)}
                        >
                          🛒
                        </button>
                        <button
                          className="grey icon-btn"
                          title="Edit"
                          onClick={() => openEdit(p)}
                        >
                          ✏️
                        </button>
                        <button
                          className="danger icon-btn"
                          title="Delete"
                          onClick={() => handleDeleteProduct(p)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {summary && (
        <div className="card">
          <h2>🏆 Best sellers - {monthLabel(month)}</h2>
          {summary.byProduct.length === 0 && <p>No sales in this month.</p>}
          {summary.byProduct.map((p) => (
            <div key={p.name} style={{ marginBottom: '12px' }}>
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
                  {p.name}{' '}
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>
                    ({p.quantity} sold)
                  </span>
                </span>
                <span>{money(p.total)}</span>
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
                    width: (p.quantity / maxSold) * 100 + '%',
                    height: '100%',
                    background: '#4f46e5',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>
          📥 Purchase history - {monthLabel(pMonth)} ({purchases.length})
        </h2>
        <div className="toolbar">
          <button className="grey" onClick={() => setPMonth(shiftMonth(pMonth, -1))}>
            ‹ Previous
          </button>
          <button
            className="grey"
            disabled={pMonth >= thisMonth}
            style={pMonth >= thisMonth ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            onClick={() => setPMonth(shiftMonth(pMonth, 1))}
          >
            Next ›
          </button>
          <button
            className="grey"
            disabled={pMonth === thisMonth}
            style={pMonth === thisMonth ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            onClick={() => setPMonth(thisMonth)}
          >
            This month
          </button>
        </div>

        {purchases.length === 0 && (
          <p>No stock bought in this month. Click the 📥 button on a product to buy stock.</p>
        )}

        {purchases.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price each</th>
                  <th>Total</th>
                  <th>Supplier</th>
                  <th>Bill</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((pu) => (
                  <tr key={pu._id}>
                    <td>
                      {formatDate(pu.boughtOn)}
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {timeOf(pu.boughtOn)}
                      </div>
                    </td>
                    <td>
                      {pu.productName}
                      {pu.note && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {pu.note}
                        </div>
                      )}
                    </td>
                    <td>{pu.quantity}</td>
                    <td>{money(pu.unitCost)}</td>
                    <td>{money(pu.total)}</td>
                    <td>{pu.supplier || '-'}</td>
                    <td>
                      {pu.hasBill ? (
                        <button
                          className="grey icon-btn"
                          title="View bill picture"
                          onClick={() => openBill(pu)}
                        >
                          📎
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        className="danger icon-btn"
                        title="Remove this purchase"
                        onClick={() => handleUndoPurchase(pu)}
                      >
                        ↩️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>
          🧾 Sales in {monthLabel(month)} ({sales.length})
        </h2>

        {!loading && !error && sales.length === 0 && (
          <p>No sales in this month. Click the 🛒 button on a product to sell it.</p>
        )}

        {sales.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price each</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Margin</th>
                  <th>Buyer</th>
                  <th>Paid by</th>
                  <th>Slip</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td>
                      {formatDate(s.soldOn)}
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {timeOf(s.soldOn)}
                      </div>
                    </td>
                    <td>
                      {s.productName}
                      {s.note && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {s.note}
                        </div>
                      )}
                    </td>
                    <td>{s.quantity}</td>
                    <td>{money(s.unitPrice)}</td>
                    <td>{money(s.total)}</td>
                    <td>
                      <span className={'badge ' + statusColor(s.status)}>
                        {s.status}
                      </span>
                      {s.balance > 0 && (
                        <div
                          style={{
                            color: '#b91c1c',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {money(s.balance)} left
                        </div>
                      )}
                    </td>
                    <td>{money(s.profit)}</td>
                    <td>{s.buyer || '-'}</td>
                    <td>{s.amountPaid > 0 ? s.method || 'Cash' : '-'}</td>
                    <td>
                      <button
                        className="grey icon-btn"
                        title="View slip"
                        onClick={() => setSlipSale(s)}
                      >
                        🧾
                      </button>
                      {s.hasSlip ? ' 📎' : ''}
                    </td>
                    <td>
                      {s.balance > 0 && (
                        <button
                          className="green"
                          title="Collect money"
                          onClick={() => openCollect(s)}
                        >
                          Collect
                        </button>
                      )}
                      <button
                        className="danger icon-btn"
                        title="Remove this sale"
                        onClick={() => handleUndoSale(s)}
                      >
                        ↩️
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

export default Shop