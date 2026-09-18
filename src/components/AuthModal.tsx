import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { authClient, useSession } from '#/lib/auth-client'
import {
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Link2,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import { useUserStore } from '#/stores/useUserStore'
import { z } from 'zod'

export type AuthModalView = 'choice' | 'signup' | 'signin'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialView?: AuthModalView
  initialLinkMode?: boolean
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function AuthModal({
  open,
  onClose,
  initialView = 'choice',
  initialLinkMode = true,
}: AuthModalProps) {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAnon = user ? Boolean(user.isAnonymous) : true
  const currentDisplayName = user?.displayName || user?.name || 'Anonymous User'

  const [view, setView] = useState<AuthModalView>(initialView)
  const [isLinking, setIsLinking] = useState<boolean>(initialLinkMode)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync initial view when modal opens
  useEffect(() => {
    if (open) {
      setView(initialView)
      setIsLinking(initialLinkMode)
      resetForm()
    }
  }, [open, initialView, initialLinkMode])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !mounted) return null

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFieldErrors({})
    setGeneralError(null)
    setLoading(false)
    setShowPass(false)
    setShowConfirmPass(false)
  }

  const handleSelectFlow = (mode: 'link' | 'fresh') => {
    setIsLinking(mode === 'link')
    setView('signup')
    setGeneralError(null)
    setFieldErrors({})
  }

  // ─── Sign In Submit ────────────────────────────────────────────────────────
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    const result = signInSchema.safeParse({ email, password })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) errs[String(issue.path[0])] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    try {
      const { error: err } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })

      if (err) {
        setGeneralError(err.message || 'Sign in failed. Please verify your credentials.')
        return
      }

      await useUserStore.getState().invalidateAndRefresh()
      resetForm()
      onClose()
    } catch (e: any) {
      setGeneralError(e.message || 'An unexpected error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Sign Up Submit ────────────────────────────────────────────────────────
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    const result = signUpSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    })

    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) errs[String(issue.path[0])] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    try {
      if (!isLinking) {
        // If creating a completely fresh account, sign out from anonymous first
        // so Better Auth creates a standalone user without linking old exams
        await authClient.signOut().catch(() => {})
      }

      const { error: err } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      })

      if (err) {
        setGeneralError(err.message || 'Sign up failed. Please try again.')
        return
      }

      await useUserStore.getState().invalidateAndRefresh()
      resetForm()
      onClose()
    } catch (e: any) {
      setGeneralError(e.message || 'An unexpected error occurred during registration.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Frosted Glass Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 md:p-7 shadow-2xl animate-modal-in z-10 overflow-y-auto max-h-[92vh] sm:max-h-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl p-1.5 sm:p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ─── 1. PROMPT / CHOICE VIEW ────────────────────────────────────────── */}
        {view === 'choice' && (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold badge-neutral mb-2 sm:mb-3">
                <Sparkles className="h-3 w-3" />
                <span>Account Options</span>
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Choose How to Continue
              </h2>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                You are currently exploring as{' '}
                <span className="font-semibold text-[var(--text-primary)]">
                  {currentDisplayName}
                </span>
                . How would you like to set up your account?
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {/* Option A: Link Account */}
              <button
                onClick={() => handleSelectFlow('link')}
                className="w-full text-left p-3 sm:p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group flex items-start gap-2.5 sm:gap-3.5"
              >
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-primary)] group-hover:bg-[var(--border-subtle)] transition-colors">
                  <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Link Current Account
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full badge-success">
                      Keep Data
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Attach your email to this session. All your created exams, completed tests, and
                    scores will be permanently saved.
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5 sm:mt-2" />
              </button>

              {/* Option B: Create Fresh Account */}
              <button
                onClick={() => handleSelectFlow('fresh')}
                className="w-full text-left p-3 sm:p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group flex items-start gap-2.5 sm:gap-3.5"
              >
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--border-subtle)] transition-colors">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Create Fresh Account
                    </h4>
                    <span className="text-[9px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full badge-neutral">
                      Clean Slate
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Start clean from scratch without transferring any current anonymous exams or
                    practice history.
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5 sm:mt-2" />
              </button>
            </div>

            <div className="pt-2 sm:pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] sm:text-xs text-[var(--text-secondary)]">
              <span>Already registered?</span>
              <button
                onClick={() => {
                  setView('signin')
                  setGeneralError(null)
                  setFieldErrors({})
                }}
                className="font-semibold text-[var(--text-primary)] underline hover:opacity-80 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* ─── 2. SIGN UP VIEW ────────────────────────────────────────────────── */}
        {view === 'signup' && (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold badge-neutral">
                  {isLinking ? <Link2 className="h-2.5 w-2.5" /> : <UserPlus className="h-2.5 w-2.5" />}
                  {isLinking ? `Linking: ${currentDisplayName}` : 'Fresh Account'}
                </span>
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                {isLinking ? 'Link & Create Account' : 'Create Fresh Account'}
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                {isLinking
                  ? 'All your current exams and scores will be saved to your account.'
                  : 'Starting with a clean profile. No previous exam history will be attached.'}
              </p>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-2.5 sm:space-y-3">
              {/* Full Name */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Full Name <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    placeholder="e.g. Alex Morgan"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.name
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Email Address <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    placeholder="alex@university.edu"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.email
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Password <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    placeholder="At least 8 characters"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.password
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Repeat Password <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    placeholder="Re-enter your password"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.confirmPassword
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((s) => !s)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                  >
                    {showConfirmPass ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* General Error Banner */}
              {generalError && (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.3)] px-3 py-1.5 text-xs text-[var(--color-danger)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2 sm:py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 mt-2 sm:mt-3 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isLinking ? 'Link & Complete Registration' : 'Create Account'}</span>
              </button>
            </form>

            {/* Switch Views */}
            <div className="pt-2 sm:pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] sm:text-xs text-[var(--text-secondary)]">
              {isAnon && (
                <button
                  onClick={() => {
                    setView('choice')
                    setGeneralError(null)
                  }}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  ← Back to options
                </button>
              )}
              <div className="ml-auto">
                <span>Already registered? </span>
                <button
                  onClick={() => {
                    setView('signin')
                    setGeneralError(null)
                    setFieldErrors({})
                  }}
                  className="font-semibold text-[var(--text-primary)] underline hover:opacity-80 cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. SIGN IN VIEW ────────────────────────────────────────────────── */}
        {view === 'signin' && (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold badge-neutral mb-1.5 sm:mb-2">
                <Lock className="h-3 w-3" />
                <span>Welcome Back</span>
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Sign in to your account
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                Access your generated exams, completed attempts, and metrics.
              </p>
            </div>

            <form onSubmit={handleSignInSubmit} className="space-y-2.5 sm:space-y-3">
              {/* Email Address */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    placeholder="alex@university.edu"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.email
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-0.5 sm:mb-1 block text-[11px] sm:text-xs font-medium text-[var(--text-secondary)]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--text-muted)]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border bg-[var(--bg-surface-elevated)] pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition ${
                      fieldErrors.password
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] focus:border-[var(--border-strong)] focus:ring-[var(--border-strong)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--color-danger)] font-medium">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* General Error Banner */}
              {generalError && (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.3)] px-3 py-1.5 text-xs text-[var(--color-danger)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2 sm:py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 mt-2 sm:mt-3 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Sign In</span>
              </button>
            </form>

            {/* Switch Views */}
            <div className="pt-2 sm:pt-2.5 border-t border-[var(--border-subtle)] text-center text-[11px] sm:text-xs text-[var(--text-secondary)]">
              <span>Don't have an account yet? </span>
              <button
                onClick={() => {
                  setView(isAnon ? 'choice' : 'signup')
                  setGeneralError(null)
                  setFieldErrors({})
                }}
                className="font-semibold text-[var(--text-primary)] underline hover:opacity-80 cursor-pointer ml-1"
              >
                Create one
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
