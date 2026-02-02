import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Mail, Lock, Loader2 } from 'lucide-react'
import { api, setAuthToken } from '../../lib/api'

const schema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Máximo 128 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme a senha')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

export default function Register() {
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' }
  })

  async function onSubmit(data) {
    setError('')
    try {
      const res = await api.post('/auth/register', { email: data.email, password: data.password })
      const token = res?.data?.access_token
      if (token) {
        setAuthToken(token)
        navigate('/', { replace: true })
      } else {
        setError('Resposta inválida do servidor.')
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Falha ao registar.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="cb-panel w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="h-6 w-6" style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-semibold">Registar</h1>
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
                autoComplete="new-password"
                className="cb-input pl-10"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Confirmar senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-text)' }} />
              <input
                type="password"
                autoComplete="new-password"
                className="cb-input pl-10"
                placeholder="Repita a senha"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{errors.confirmPassword.message}</p>
            )}
          </div>
          {error && (
            <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={isSubmitting} className="cb-btn cb-btn-primary w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isSubmitting ? 'A registar...' : 'Registar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-text)' }}>
          Já tem conta?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
