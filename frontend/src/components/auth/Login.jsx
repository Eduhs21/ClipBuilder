import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'
import { api, setAuthToken } from '../../lib/api'

const schema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

export default function Login() {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  })

  async function onSubmit(data) {
    setError('')
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      const token = res?.data?.access_token
      if (token) {
        setAuthToken(token)
        navigate(from, { replace: true })
      } else {
        setError('Resposta inválida do servidor.')
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Falha ao iniciar sessão.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="cb-panel w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <LogIn className="h-6 w-6" style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-semibold">Entrar</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-text)' }} />
              <input
                type="email"
                autoComplete="email"
                className="cb-input pl-10"
                placeholder="seu@email.com"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-text)' }} />
              <input
                type="password"
                autoComplete="current-password"
                className="cb-input pl-10"
                placeholder="••••••••"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>
            )}
          </div>
          {error && (
            <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="cb-btn cb-btn-primary flex-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {isSubmitting ? 'A entrar...' : 'Entrar'}
            </button>
            <Link to="/forgot-password" className="cb-btn text-center" style={{ color: 'var(--accent)' }}>
              Esqueci a senha
            </Link>
          </div>
        </form>
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-text)' }}>
          Ainda não tem conta?{' '}
          <Link to="/register" className="font-medium" style={{ color: 'var(--accent)' }}>Registar</Link>
        </p>
      </div>
    </div>
  )
}
