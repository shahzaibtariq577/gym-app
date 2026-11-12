import { useState, useContext } from 'react'
import CameraCapture from '../CameraCapture'
import SettingsContext from '../SettingsContext'
import { API, resizePhoto } from '../utils'

// The Settings page: gym information, owner profile (name and photo),
// and the login details (username and password).
function Settings() {
  const ctx = useContext(SettingsContext)
  const { setSettings } = ctx

  // Gym information and owner profile
  const [gymName, setGymName] = useState(ctx.gymName)
  const [gymPhone, setGymPhone] = useState(ctx.gymPhone)
  const [gymAddress, setGymAddress] = useState(ctx.gymAddress)
  const [ownerName, setOwnerName] = useState(ctx.ownerName)
  const [ownerPhoto, setOwnerPhoto] = useState(ctx.ownerPhoto)
  const [profileMsg, setProfileMsg] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Login details
  const [username, setUsername] = useState(ctx.username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [accountMsg, setAccountMsg] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  function handlePhotoFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileMsg('Error: Please choose a picture file')
      return
    }
    setProfileMsg('')
    resizePhoto(file)
      .then((text) => setOwnerPhoto(text))
      .catch((err) => setProfileMsg('Error: ' + err.message))
  }

  function handleCameraPhoto(text) {
    setProfileMsg('')
    setOwnerPhoto(text)
  }

  function saveProfile(e) {
    e.preventDefault()
    if (savingProfile) return

    if (!gymName.trim()) {
      setProfileMsg('Error: Gym name cannot be empty')
      return
    }

    setProfileMsg('')
    setSavingProfile(true)

    fetch(API + '/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymName: gymName,
        gymPhone: gymPhone,
        gymAddress: gymAddress,
        ownerName: ownerName,
        ownerPhoto: ownerPhoto,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSavingProfile(false)
        if (data.error) {
          setProfileMsg('Error: ' + data.error)
        } else {
          setSettings(data) // the side menu, Dashboard and slips update at once
          setProfileMsg('Saved')
        }
      })
      .catch(() => {
        setSavingProfile(false)
        setProfileMsg('Error: Could not reach the backend')
      })
  }

  function saveAccount(e) {
    e.preventDefault()
    if (savingAccount) return

    const changingName = username.trim().toLowerCase() !== ctx.username
    const changingPassword = newPassword !== ''

    if (!changingName && !changingPassword) {
      setAccountMsg('Error: Nothing to change')
      return
    }
    if (!currentPassword) {
      setAccountMsg('Error: Please type your current password')
      return
    }
    if (changingName && username.trim().length < 3) {
      setAccountMsg('Error: Username must have at least 3 characters')
      return
    }
    if (changingPassword && newPassword.length < 8) {
      setAccountMsg('Error: New password must have at least 8 characters')
      return
    }
    if (changingPassword && newPassword !== confirmPassword) {
      setAccountMsg('Error: The two new passwords are not the same')
      return
    }

    setAccountMsg('')
    setSavingAccount(true)

    const body = { currentPassword: currentPassword }
    if (changingName) body.newUsername = username.trim()
    if (changingPassword) body.newPassword = newPassword

    fetch(API + '/settings/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setSavingAccount(false)
        if (data.error) {
          setAccountMsg('Error: ' + data.error)
        } else {
          setSettings((old) => ({ ...old, username: data.username }))
          setUsername(data.username)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setAccountMsg(
            changingPassword
              ? 'Saved. Use the new password the next time you log in.'
              : 'Saved. Use the new username the next time you log in.'
          )
        }
      })
      .catch(() => {
        setSavingAccount(false)
        setAccountMsg('Error: Could not reach the backend')
      })
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="card">
        <h2>🏋️ Gym and owner profile</h2>
        <form onSubmit={saveProfile}>
          <div className="form-grid">
            <label className="form-field">
              Gym name *
              <input
                maxLength={40}
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
              />
            </label>
            <label className="form-field">
              Gym phone
              <input
                maxLength={30}
                placeholder="03xxxxxxxxx"
                value={gymPhone}
                onChange={(e) => setGymPhone(e.target.value)}
              />
            </label>
            <label className="form-field">
              Gym address
              <input
                maxLength={120}
                placeholder="Street, city"
                value={gymAddress}
                onChange={(e) => setGymAddress(e.target.value)}
              />
            </label>
            <label className="form-field">
              Owner name
              <input
                maxLength={40}
                placeholder="Your name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </label>

            <div className="photo-field">
              {ownerPhoto ? (
                <img className="photo-preview" src={ownerPhoto} alt="Owner" />
              ) : (
                <div className="photo-empty">👤</div>
              )}
              <div className="photo-info">
                <span className="photo-title">
                  {ownerPhoto !== ctx.ownerPhoto
                    ? 'Owner photo (not saved yet)'
                    : 'Owner photo'}
                </span>
                <div className="photo-actions">
                  <label className="file-btn">
                    📁 Choose from PC
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoFile}
                    />
                  </label>
                  <CameraCapture onCapture={handleCameraPhoto} />
                  {ownerPhoto && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => setOwnerPhoto('')}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="info-note">
            The gym name, phone and address show on the payment slips. The owner
            name and photo show on the Dashboard and in the side menu.
          </p>

          {profileMsg && (
            <p
              className={
                profileMsg.startsWith('Error') ? 'msg-error' : 'msg-ok'
              }
            >
              {profileMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            style={savingProfile ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>🔐 Login details</h2>
        <form onSubmit={saveAccount}>
          <div className="form-grid">
            <label className="form-field">
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="form-field">
              Current password *
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="form-field">
              New password (leave empty to keep)
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="form-field">
              Type the new password again
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              margin: '10px 0',
            }}
          >
            <input
              type="checkbox"
              style={{ margin: 0 }}
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            Show passwords
          </label>

          <p className="info-note">
            The current password is always needed to change the username or the
            password. A new password must have at least 8 characters.
          </p>

          {accountMsg && (
            <p
              className={
                accountMsg.startsWith('Error') ? 'msg-error' : 'msg-ok'
              }
            >
              {accountMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingAccount}
            style={savingAccount ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {savingAccount ? 'Saving...' : 'Save login details'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Settings