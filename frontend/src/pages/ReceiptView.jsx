import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API } from '../utils'
import SettingsContext from '../SettingsContext'
import Slip from '../Slip'
import ShopSlip from '../ShopSlip'

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div className="card" style={{ marginBottom: 0 }}>
        {children}
      </div>
    </div>
  )
}

function ReceiptView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(API + '/receipts/' + token)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) setError(result.error)
        else setData(result)
      })
      .catch(() => setError('Could not load the receipt. Please try again.'))
  }, [token])

  if (error) {
    return (
      <Centered>
        <p className="msg-error">{error}</p>
        <Link to="/">Go to home</Link>
      </Centered>
    )
  }

  if (!data) {
    return <Centered>Loading receipt...</Centered>
  }

  const settings = {
    gymName: data.gymName,
    gymPhone: data.gymPhone,
    gymAddress: data.gymAddress,
    setSettings: () => {},
  }

  return (
    <SettingsContext.Provider value={settings}>
      {data.type === 'shop' ? (
        <ShopSlip sale={data.sale} publicView onClose={() => {}} />
      ) : (
        <Slip payment={data.payment} publicView onClose={() => {}} />
      )}
    </SettingsContext.Provider>
  )
}

export default ReceiptView