import { createContext } from 'react'

// The gym settings and the owner profile, shared with every page.
// App.jsx fills it after login. setSettings changes it for the whole app.
const SettingsContext = createContext({
  gymName: 'My Gym',
  gymPhone: '',
  gymAddress: '',
  ownerName: '',
  ownerPhoto: '',
  username: '',
  setSettings: () => {},
})

export default SettingsContext