const TOKEN_KEY = 'warehouse_access_token'

export function getAccessToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token) {
  if (!token) return
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function consumeOAuthToken() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('access_token')
  if (!token) return
  setAccessToken(token)
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}
