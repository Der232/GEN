import { Link, useRouterState } from '@tanstack/react-router'
import { authClient, useSession } from '#/lib/auth-client'
import {
  Sparkles,
  Compass,
  BookOpen,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import AuthModal from './AuthModal'

const NAV_ITEMS = [
  { to: '/generate', icon: Sparkles, label: 'Generate' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/my-exams', icon: BookOpen, label: 'My Exams' },
]

const BOTTOM_ITEMS = [
  { to: '/account', icon: User, label: 'Account' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const user = session?.user as any
  const isAnon = user ? Boolean(user.isAnonymous) : true
  const accountName = user?.name || user?.displayName || ''

  return (
    <>
      {/* ── Mobile Hamburger Button ── */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-md"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar Container ── */}
      <aside
        className={`
          fixed md:sticky top-0 h-screen self-start left-0 z-40
          flex flex-col shrink-0 border-r border-[var(--border-subtle)]
          bg-[var(--bg-surface)] transition-all duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-16' : 'md:w-60'}
        `}
      >
        {/* Logo / Brand Header */}
        <div className={`flex items-center justify-between border-b border-[var(--border-subtle)] ${collapsed && !mobileOpen ? 'px-3 py-5 justify-center' : 'px-5 py-5'}`}>
          <Link to="/" className="flex flex-col no-underline group" onClick={() => setMobileOpen(false)}>
            <span className="font-heading font-bold text-base tracking-tight text-[var(--text-primary)] group-hover:opacity-80 transition-opacity">
              GEN
            </span>
            {(!collapsed || mobileOpen) && (
              <span className="text-[10px] text-[var(--text-muted)] -mt-0.5 font-mono tracking-widest">
                EXAM AI
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase px-2 mb-1">
            {(!collapsed || mobileOpen) && 'Workspace'}
          </div>

          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium
                  transition-all duration-150 no-underline
                  ${active
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold border border-[var(--nav-active-border)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
                  }
                `}
                title={collapsed ? label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--nav-active-text)]' : ''}`} />
                {(!collapsed || mobileOpen) && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer / Account Section */}
        <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-1">
          {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium
                  transition-all duration-150 no-underline
                  ${active
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold border border-[var(--nav-active-border)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
                  }
                `}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || mobileOpen) && <span className="truncate">{label}</span>}
              </Link>
            )
          })}

          {/* User Profile Pill */}
          {(!collapsed || mobileOpen) && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 px-1 hover:opacity-80 transition-opacity no-underline"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-6 w-6 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                    {accountName}
                  </p>
                  {!isAnon && user?.email ? (
                    <p className="text-[9px] text-[var(--text-muted)] truncate font-mono">
                      {user.email}
                    </p>
                  ) : (
                    <p className="text-[9px] text-[var(--color-warning)] truncate font-medium">
                      Anonymous
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Auth Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
