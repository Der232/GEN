import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient, useSession } from '#/lib/auth-client'
import {
  ShieldCheck,
  Award,
  BookOpen,
  CheckCircle,
  LogOut,
  AlertTriangle,
  ArrowRight,
  Plus,
  Compass,
  Target,
} from 'lucide-react'
import AuthModal from '#/components/AuthModal'
import { useExamPerformanceStore } from '#/stores/useExamPerformanceStore'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/account')({ component: AccountPage })

interface UserStats {
  examsCreated: number
  examsTaken: number
  averageScore: number
}

function AccountPage() {
  const { data: session } = useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const { stats, fetchUserMe } = useUserStore()
  const performance = useExamPerformanceStore()

  const user = session?.user as any
  const isAnon = user ? Boolean(user.isAnonymous) : true

  // Display user's actual account name from Better Auth
  const accountName = user?.name || user?.displayName || ''

  useEffect(() => {
    fetchUserMe()
  }, [session, fetchUserMe])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Account Details
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Manage your personal profile, test stats, and workspace.
          </p>
        </div>
      </div>

      {/* Main Identity Card (no "A" avatar box, no anonymous badge) */}
      <div className="gen-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
                {accountName}
              </h2>
              {!isAnon && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold badge-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  Registered
                </span>
              )}
            </div>
            {!isAnon && user?.email && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                {user.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isAnon ? (
              <button
                onClick={() => authClient.signOut()}
                className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 font-semibold cursor-pointer shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Create Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Anonymous Warning Card with preserved warning styling */}
        {isAnon && (
          <div className="p-4 rounded-xl bg-[var(--color-warning-subtle)] border border-[var(--color-warning)]/30 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-[var(--color-warning)] uppercase tracking-wider">
                You are signed in as an anonymous user
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Data is saved to this device. Register an account anytime to sync your exams and history across devices.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Performance & Workspace Metrics (Backed by Zustand persistence) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Performance Metrics
          </h3>
          <span className="text-[11px] text-[var(--text-muted)]">Live Statistics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="gen-card gen-card-hover p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)] font-medium">Exams Created</span>
              <div className="p-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--border-strong)] transition-colors">
                <BookOpen className="h-4 w-4 text-[var(--text-primary)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-heading text-3xl font-bold text-[var(--text-primary)]">
                {stats.examsCreated}
              </p>
              <span className="text-[11px] text-[var(--text-muted)]">total</span>
            </div>
          </div>

          <div className="gen-card gen-card-hover p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)] font-medium">Completed Attempts</span>
              <div className="p-2 rounded-xl bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 transition-colors">
                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-heading text-3xl font-bold text-[var(--text-primary)]">
                {stats.examsTaken}
              </p>
              <span className="text-[11px] text-[var(--text-muted)]">sessions</span>
            </div>
          </div>

          <div className="gen-card gen-card-hover p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)] font-medium">Average Score</span>
              <div className="p-2 rounded-xl bg-[var(--color-warning-subtle)] border border-[var(--color-warning)]/20 transition-colors">
                <Award className="h-4 w-4 text-[var(--color-warning)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-heading text-3xl font-bold text-[var(--text-primary)]">
                {stats.averageScore}%
              </p>
              <span className="text-[11px] text-[var(--text-muted)]">accuracy</span>
            </div>
            <div className="w-full bg-[var(--bg-surface-elevated)] rounded-full h-1.5 mt-3 overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="h-full rounded-full transition-all duration-500 bg-[var(--color-warning)]"
                style={{ width: `${Math.min(100, Math.max(0, stats.averageScore))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Extra Zustand Persisted Question Mastery Stats */}
        {performance.totalQuestionsAnswered > 0 && (
          <div className="p-4 rounded-xl gen-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Target className="h-4 w-4 text-[var(--text-primary)] shrink-0" />
              <span className="text-[var(--text-secondary)]">
                Total Questions Practiced:{' '}
                <strong className="text-[var(--text-primary)] font-semibold">
                  {performance.totalQuestionsAnswered}
                </strong>{' '}
                ({performance.totalQuestionsCorrect} answered correctly)
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Persisted in local profile
            </span>
          </div>
        )}
      </div>

      {/* Quick Launchpad */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/generate"
            className="gen-card gen-card-hover p-4 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[var(--text-primary)]">Create Exam</h5>
                <p className="text-[11px] text-[var(--text-muted)]">Generate with AI</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/my-exams"
            className="gen-card gen-card-hover p-4 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[var(--text-primary)]">My Library</h5>
                <p className="text-[11px] text-[var(--text-muted)]">Manage your tests</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/discover"
            className="gen-card gen-card-hover p-4 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-[var(--text-primary)]">Discover</h5>
                <p className="text-[11px] text-[var(--text-muted)]">Explore public exams</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
