import { useState } from 'react'
import { authClient, useSession } from '#/lib/auth-client'
import { X, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useUserStore } from '#/stores/useUserStore'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'signin' | 'signup'

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { data: session } = useSession()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setName('')
    setError(null)
    setLoading(false)
  }

  const switchMode = (m: Mode) => {
    reset()
    setMode(m)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your full name.')
          setLoading(false)
          return
        }

        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
        })
        if (err) {
          setError(err.message ?? 'Sign up failed')
          return
        }
      } else {
        const { error: err } = await authClient.signIn.email({ email, password })
        if (err) {
          setError(err.message ?? 'Sign in failed')
          return
        }
      }

      await useUserStore.getState().invalidateAndRefresh()
      reset()
      onClose()
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Authentication error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl animate-fade-in z-10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
            {mode === 'signin' ? 'Sign in to your account' : 'Create permanent account'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {mode === 'signin'
              ? 'Access all your generated exams and practice scores.'
              : 'All exams created under your anonymous session will be linked automatically.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Full Name <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                required
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border-strong)] transition"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border-strong)] transition"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border-strong)] transition"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.3)] px-3 py-2 text-xs text-[var(--color-danger)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{mode === 'signin' ? 'Sign In' : 'Create & Link Account'}</span>
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-[var(--text-secondary)]">
          {mode === 'signin' ? "Don't have an account yet? " : 'Already registered? '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-[var(--text-primary)] underline hover:opacity-80 ml-1 cursor-pointer"
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
