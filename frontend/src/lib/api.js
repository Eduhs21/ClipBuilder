import axios from 'axios'

// Determine default baseURL from Vite env, localStorage, or fallback
function resolveDefaultBaseUrl() {
  try {
    // Vite exposes import.meta.env.VITE_API_URL
    // Use it when available, otherwise use localStorage override, otherwise localhost
    const fromVite = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    if (fromVite) return fromVite
  } catch {}

  try {
    const stored = localStorage.getItem('DOCUVIDEO_API_URL')
    if (stored) return stored
  } catch {}

  return 'http://127.0.0.1:8000'
}

export const api = axios.create({
  baseURL: resolveDefaultBaseUrl()
})

export function setApiUrl(url) {
  const u = (url || '').toString().trim()
  if (u) {
    api.defaults.baseURL = u
    try { localStorage.setItem('DOCUVIDEO_API_URL', u) } catch {}
  } else {
    delete api.defaults.baseURL
    try { localStorage.removeItem('DOCUVIDEO_API_URL') } catch {}
  }
}

export function getApiUrl() {
  return api.defaults.baseURL || ''
}

export function setGoogleApiKey(key) {
  const k = (key || '').toString().trim()
  if (k) {
    api.defaults.headers['X-Google-Api-Key'] = k
    try { localStorage.setItem('DOCUVIDEO_GOOGLE_API_KEY', k) } catch {}
  } else {
    if (api.defaults.headers) delete api.defaults.headers['X-Google-Api-Key']
    try { localStorage.removeItem('DOCUVIDEO_GOOGLE_API_KEY') } catch {}
  }
}

// Initialize from localStorage if present
try {
  const storedKey = localStorage.getItem('DOCUVIDEO_GOOGLE_API_KEY') || ''
  if (storedKey) api.defaults.headers['X-Google-Api-Key'] = storedKey
} catch (e) {
  // ignore (SSR or restricted env)
}

// Expose helper to clear stored credentials
export function clearStoredConfig() {
  try { localStorage.removeItem('DOCUVIDEO_GOOGLE_API_KEY') } catch {}
  try { localStorage.removeItem('DOCUVIDEO_API_URL') } catch {}
  if (api.defaults.headers) delete api.defaults.headers['X-Google-Api-Key']
  delete api.defaults.baseURL
}
