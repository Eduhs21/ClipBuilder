import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, getStoredToken, setAuthToken } from '../../lib/api'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'unauthorized'
  const location = useLocation()
  const token = getStoredToken()

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus('unauthorized')
      return
    }
    setAuthToken(token)
    api.get('/auth/me')
      .then(() => setStatus('ok'))
      .catch(() => setStatus('unauthorized'))
  }, [token])

  if (status === 'unauthorized') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" style={{ borderColor: 'var(--accent)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-text)' }}>A verificar sessão...</p>
        </div>
      </div>
    )
  }
  return children
}
