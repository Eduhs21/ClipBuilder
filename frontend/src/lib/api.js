import axios from 'axios'

const LS = {
  apiUrl: 'CLIPBUILDER_API_URL',
  googleApiKey: 'CLIPBUILDER_GOOGLE_API_KEY'
}

// Determine default baseURL from Vite env, localStorage, or fallback
function resolveDefaultBaseUrl() {
  try {
    // Vite exposes import.meta.env.VITE_API_URL
    // Use it when available, otherwise use localStorage override, otherwise localhost
    const fromVite = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    if (fromVite) return fromVite
  } catch {}

  try {
    const stored = localStorage.getItem(LS.apiUrl)
    if (stored) return stored
  } catch {}

  // Default to same-origin proxy (works in Docker via nginx: /api -> backend:8000)
  // In dev, Vite proxies /api to http://127.0.0.1:8000 (see vite.config.js)
  return '/api'
}

export const api = axios.create({
  baseURL: resolveDefaultBaseUrl()
})

export function setApiUrl(url) {
  const u = (url || '').toString().trim()
  if (u) {
    api.defaults.baseURL = u
    try {
      localStorage.setItem(LS.apiUrl, u)
    } catch {}
  } else {
    delete api.defaults.baseURL
    try {
      localStorage.removeItem(LS.apiUrl)
    } catch {}
  }
}

export function getApiUrl() {
  return api.defaults.baseURL || ''
}

export function setGoogleApiKey(key) {
  const k = (key || '').toString().trim()
  if (k) {
    api.defaults.headers['X-Google-Api-Key'] = k
    try {
      localStorage.setItem(LS.googleApiKey, k)
    } catch {}
  } else {
    if (api.defaults.headers) delete api.defaults.headers['X-Google-Api-Key']
    try {
      localStorage.removeItem(LS.googleApiKey)
    } catch {}
  }
}

// Initialize from localStorage if present
try {
  const storedKey = localStorage.getItem(LS.googleApiKey) || ''
  if (storedKey) api.defaults.headers['X-Google-Api-Key'] = storedKey
} catch (e) {
  // ignore (SSR or restricted env)
}

// Expose helper to clear stored credentials
export function clearStoredConfig() {
  try {
    localStorage.removeItem(LS.googleApiKey)
  } catch {}
  try {
    localStorage.removeItem(LS.apiUrl)
  } catch {}
  if (api.defaults.headers) delete api.defaults.headers['X-Google-Api-Key']
  delete api.defaults.baseURL
}
