import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	LogOut,
	Menu,
	Moon,
	Settings,
	Sun,
	User,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOutAndResetToAnonymous, useSession } from "#/lib/auth-client";
import { useMobileNavStore } from "#/stores/useMobileNavStore";
import { useUserStore } from "#/stores/useUserStore";
import AuthModal, { type AuthModalView } from "./AuthModal";

export default function TopHeader() {
	const { data: session } = useSession();
	const user = session?.user as any;
	const isAnon = user ? Boolean(user.isAnonymous) : true;
	const userName = user?.name || user?.displayName || "Student";
	const userEmail = user?.email || "";

	// Mobile nav state
	const isMobileNavOpen = useMobileNavStore((s) => s.isOpen);
	const toggleMobileNav = useMobileNavStore((s) => s.toggle);

	// Auth modal control
	const [authOpen, setAuthOpen] = useState(false);
	const [authView, setAuthView] = useState<AuthModalView>("signin");
	const [authLinkMode, setAuthLinkMode] = useState(true);

	// Dropdown control
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Theme control
	const [theme, setTheme] = useState<"dark" | "light">("dark");

	useEffect(() => {
		if (typeof window !== "undefined") {
			const isLight = document.documentElement.classList.contains("light");
			setTheme(isLight ? "light" : "dark");
		}
	}, []);

	const toggleTheme = () => {
		const nextTheme = theme === "dark" ? "light" : "dark";
		setTheme(nextTheme);
		if (typeof window !== "undefined") {
			localStorage.setItem("theme", nextTheme);
			document.documentElement.classList.remove("dark", "light");
			document.documentElement.classList.add(nextTheme);
			document.documentElement.setAttribute("data-theme", nextTheme);
			document.documentElement.style.colorScheme = nextTheme;
		}
	};

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDropdownOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const openAuth = (view: AuthModalView, linkMode = true) => {
		setAuthView(view);
		setAuthLinkMode(linkMode);
		setAuthOpen(true);
	};

	const handleLogOut = async () => {
		setDropdownOpen(false);
		await signOutAndResetToAnonymous();
		useUserStore.getState().clearUser();
		await useUserStore.getState().invalidateAndRefresh();
	};

	// Extract first name only (if "John Doe", show "John"; if "John", show "John")
	const getFirstName = (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return "Student";
		return trimmed.split(/\s+/)[0];
	};

	const firstName = getFirstName(userName);

	return (
		<>
			<header className="flex h-14 w-full shrink-0 items-center justify-between bg-transparent border-none shadow-none px-4 sm:px-6">
				{/* Left Side: Mobile Theme Toggle (<md) & Desktop empty spacer (>=md) */}
				<div className="flex items-center">
					<button
						type="button"
						onClick={toggleTheme}
						className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
						title={
							theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"
						}
						aria-label="Toggle dark and light theme"
					>
						{theme === "dark" ? (
							<Sun className="h-3.5 w-3.5 transition-transform hover:rotate-45" />
						) : (
							<Moon className="h-3.5 w-3.5 transition-transform hover:-rotate-12" />
						)}
					</button>
					<div className="hidden md:flex items-center md:pl-0" />
				</div>

				{/* Right Side: Sign In / First Name + Desktop Theme Toggle + Mobile Hamburger */}
				<div className="flex items-center gap-2.5 sm:gap-4">
					{/* ─── Case 1: Anonymous User — Show only "Sign In" ─── */}
					{isAnon ? (
						<button
							type="button"
							onClick={() => openAuth("signin")}
							className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer px-1.5 py-1"
						>
							Sign In
						</button>
					) : (
						/* ─── Case 2: Signed-In User — Show ONLY first name with dropdown ─── */
						<div className="relative" ref={dropdownRef}>
							<button
								type="button"
								onClick={() => setDropdownOpen((prev) => !prev)}
								aria-expanded={dropdownOpen}
								aria-haspopup="true"
								className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer py-1"
							>
								<span>{firstName}</span>
								<ChevronDown
									className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150 ${
										dropdownOpen ? "rotate-180" : ""
									}`}
								/>
							</button>

							{/* Compact User Dropdown Menu */}
							{dropdownOpen && (
								<div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-2xl animate-modal-in z-50">
									{/* User details header */}
									<div className="px-3 py-2 border-b border-[var(--border-subtle)]">
										<p className="text-xs font-semibold text-[var(--text-primary)] truncate">
											{userName}
										</p>
										{userEmail && (
											<p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
												{userEmail}
											</p>
										)}
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
											type="button"
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

					{/* ─── Desktop Moon / Sun Theme Toggle (>=md) ─── */}
					<button
						type="button"
						onClick={toggleTheme}
						className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
						title={
							theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"
						}
						aria-label="Toggle dark and light theme"
					>
						{theme === "dark" ? (
							<Sun className="h-3.5 w-3.5 transition-transform hover:rotate-45" />
						) : (
							<Moon className="h-3.5 w-3.5 transition-transform hover:-rotate-12" />
						)}
					</button>

					{/* ─── Mobile Hamburger Menu Button (Rightmost, <md) ─── */}
					<button
						type="button"
						onClick={toggleMobileNav}
						className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-sm"
						aria-label="Toggle navigation menu"
					>
						{isMobileNavOpen ? (
							<X className="h-4 w-4" />
						) : (
							<Menu className="h-4 w-4" />
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
	);
}
