import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Key, Loader2, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'

const schema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido')
})

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  })

  async function onSubmit(data) {
    setError('')
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setSent(true)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Ocorreu um erro.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="cb-panel w-full max-w-md p-6 sm:p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--success)' }} />
          <h1 className="text-xl font-semibold mb-2">E-mail enviado</h1>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            Se o e-mail existir em nossa base, você receberá instruções de recuperação em instantes.
          </p>
          <Link to="/login" className="cb-btn cb-btn-primary mt-6 inline-flex">
            Voltar ao início de sessão
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="cb-panel w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Key className="h-6 w-6" style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--muted-text)' }}>
          Indique o e-mail da sua conta. Se existir, enviaremos instruções para redefinir a senha.
        </p>
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
          {error && (
            <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--danger)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="cb-btn cb-btn-primary flex-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSubmitting ? 'A enviar...' : 'Enviar'}
            </button>
            <Link to="/login" className="cb-btn">
              Cancelar
            </Link>
          </div>
        </form>
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-text)' }}>
          <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>Voltar ao início de sessão</Link>
        </p>
      </div>
    </div>
  )
}
