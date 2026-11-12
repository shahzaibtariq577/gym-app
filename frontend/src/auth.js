import { API } from './utils'

const TOKEN_KEY = 'gymToken'

// The login token is kept in the browser, so a refresh does not log the owner out
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch (err) {
    return ''
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (err) {
    // storage is blocked: the owner will have to log in again after a refresh
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (err) {
    // nothing to do
  }
}

// One place for all requests: every fetch to our backend now sends the token.
// If the backend answers 401 (no token or token expired), the owner is logged out.
// The flag stops this from being added twice when Vite reloads the file.
if (!window.__gymFetchPatched) {
  window.__gymFetchPatched = true
  const realFetch = window.fetch.bind(window)

  window.fetch = function (url, options) {
    const isOurApi = typeof url === 'string' && url.startsWith(API)
    if (!isOurApi) return realFetch(url, options)

    const headers = new Headers((options && options.headers) || {})
    const token = getToken()
    if (token) headers.set('Authorization', 'Bearer ' + token)

    return realFetch(url, { ...options, headers }).then((res) => {
      const isLogin = url.startsWith(API + '/auth/login')
      if (res.status === 401 && !isLogin) {
        clearToken()
        window.dispatchEvent(new Event('gym-logout'))
      }
      return res
    })
  }
}