import { useState, useEffect, useRef } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useSession, signOutAndResetToAnonymous } from '#/lib/auth-client'
import { useUserStore } from '#/stores/useUserStore'
import {
  Sun,
  Moon,
  LogIn,
  User,
  LogOut,
  ChevronDown,
  Settings,
  BookOpen,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import AuthModal, { type AuthModalView } from './AuthModal'

export default function TopHeader() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAnon = user ? Boolean(user.isAnonymous) : true
  const userName = user?.name || user?.displayName || 'Student'
  const userEmail = user?.email || ''

  // Auth modal control
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<AuthModalView>('choice')
  const [authLinkMode, setAuthLinkMode] = useState(true)

  // Dropdown control
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Theme control
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLight = document.documentElement.classList.contains('light')
      setTheme(isLight ? 'light' : 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme)
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
      document.documentElement.style.colorScheme = nextTheme
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const openAuth = (view: AuthModalView, linkMode = true) => {
    setAuthView(view)
    setAuthLinkMode(linkMode)
    setAuthOpen(true)
  }

  const handleLogOut = async () => {
    setDropdownOpen(false)
    await signOutAndResetToAnonymous()
    useUserStore.getState().clearUser()
    await useUserStore.getState().invalidateAndRefresh()
  }

  // User initials for compact avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'U'
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/80 px-4 sm:px-6 backdrop-blur-md transition-colors">
        {/* Left Side: Mobile spacing / minimal badge */}
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-underline"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
            <span>AI Practice Platform</span>
          </Link>
        </div>

        {/* Right Side: Auth controls + Moon/Sun theme toggle */}
        <div className="flex items-center gap-2.5">
          {/* ─── Case 1: Anonymous User ─── */}
          {isAnon ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuth('signin')}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => openAuth('choice')}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          ) : (
            /* ─── Case 2: Registered User with Dropdown ─── */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)] px-2.5 py-1.5 transition-all cursor-pointer shadow-sm group"
              >
                <div className="h-6 w-6 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                  {getInitials(userName)}
                </div>
                <span className="max-w-[120px] truncate text-xs font-semibold text-[var(--text-primary)] hidden sm:inline">
                  {userName}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-150 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Compact User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-2xl animate-modal-in z-50">
                  {/* User details header */}
                  <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {userName}
                    </p>
                    {userEmail && (
                      <p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                        {userEmail}
                      </p>
                    )}
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold badge-success">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      <span>Registered Account</span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      to="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors no-underline"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Account Details</span>
                    </Link>
                    <Link
                      to="/my-exams"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors no-underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>My Exams</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors no-underline"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Divider and Log Out button */}
                  <div className="pt-1 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={handleLogOut}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Moon / Sun Theme Toggle ─── */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle dark and light theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
            )}
          </button>
        </div>
      </header>

      {/* Global Auth Modal triggered from header */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
        initialLinkMode={authLinkMode}
      />
    </>
  )
}
