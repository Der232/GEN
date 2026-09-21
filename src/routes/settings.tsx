import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { useState } from "react";
import { authClient, useSession } from "#/lib/auth-client";
import { useExamPerformanceStore } from "#/stores/useExamPerformanceStore";
import { useExamSessionStore } from "#/stores/useExamSessionStore";
import { useUserStore } from "#/stores/useUserStore";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
	const { data: session } = useSession();
	const user = session?.user as any;
	const isAnon = user ? Boolean(user.isAnonymous) : true;

	const [theme, setTheme] = useState<"dark" | "light">(() => {
		if (typeof window !== "undefined") {
			return document.documentElement.classList.contains("light")
				? "light"
				: "dark";
		}
		return "dark";
	});
	const [clearing, setClearing] = useState(false);
	const [cleared, setCleared] = useState(false);

	const handleThemeChange = (newTheme: "dark" | "light") => {
		setTheme(newTheme);
		if (typeof window !== "undefined") {
			localStorage.setItem("theme", newTheme);
			document.documentElement.classList.remove("dark", "light");
			document.documentElement.classList.add(newTheme);
			document.documentElement.setAttribute("data-theme", newTheme);
			document.documentElement.style.colorScheme = newTheme;
		}
	};

	const handleDeleteOrClear = async () => {
		const confirmMessage = isAnon
			? "Are you sure you want to clear your anonymous data? Your personal practice history will be cleared. Any public exams you published will remain available in Discover."
			: "Are you sure you want to delete your account? Your personal practice history and account will be deleted. Any public exams you published will remain available in Discover.";

		if (!confirm(confirmMessage)) return;

		setClearing(true);
		try {
			const res = await fetch("/api/user/delete", { method: "POST" });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to clear data");
			}

			// Clear client Zustand stores and local state
			useUserStore.getState().clearUser();
			useExamPerformanceStore.getState().clearAllPerformanceData();
			useExamSessionStore.getState().clearSession();
			localStorage.clear();

			// Sign out from Better Auth client state
			await authClient.signOut().catch(() => {});

			setCleared(true);
			setTimeout(() => {
				window.location.href = "/";
			}, 800);
		} catch (err: any) {
			alert(err.message || "An error occurred while deleting data.");
			setClearing(false);
		}
	};

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in space-y-6 sm:space-y-8">
			{/* Header */}
			<div>
				<h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
					Settings
				</h1>
				<p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
					Configure visual preferences and manage your account data.
				</p>
			</div>

			{/* Visual Experience */}
			<div className="gen-card p-4 sm:p-6 space-y-3 sm:space-y-4">
				<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
					Visual Interface
				</h2>

				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
					<div>
						<h3 className="text-sm font-semibold text-[var(--text-primary)]">
							Theme Mode
						</h3>
						<p className="text-xs text-[var(--text-secondary)] mt-0.5">
							Choose between Dark and Light mode.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => handleThemeChange("dark")}
							className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border flex items-center gap-2 text-xs font-medium cursor-pointer transition ${
								theme === "dark"
									? "btn-primary"
									: "btn-secondary text-[var(--text-secondary)]"
							}`}
						>
							<Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							<span>Dark</span>
						</button>
						<button
							type="button"
							onClick={() => handleThemeChange("light")}
							className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border flex items-center gap-2 text-xs font-medium cursor-pointer transition ${
								theme === "light"
									? "btn-primary"
									: "btn-secondary text-[var(--text-secondary)]"
							}`}
						>
							<Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							<span>Light</span>
						</button>
					</div>
				</div>
			</div>

			{/* Danger Zone: Clear Data (Anon) vs Delete Account (Registered) */}
			<div className="gen-card p-4 sm:p-6 space-y-3 sm:space-y-4 border-l-4 border-l-[var(--color-danger)]">
				<div>
					<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-danger)]">
						{isAnon ? "Clear Anonymous Data" : "Delete Account"}
					</h2>
					<p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
						{isAnon
							? "Clearing your anonymous session will delete your private test attempts and personal session history. Any public exams you created will remain available on the Discover page."
							: "Deleting your account will permanently remove your login credentials and personal test attempts. Any exams you published publicly will remain in the Discover page with your creator display name preserved."}
					</p>
				</div>

				<button
					type="button"
					onClick={handleDeleteOrClear}
					disabled={clearing || cleared}
					className="btn-danger text-xs px-4 py-2.5 inline-flex items-center gap-2 cursor-pointer font-semibold disabled:opacity-50"
				>
					{cleared ? (
						<>
							<Check className="h-4 w-4" />
							<span>
								{isAnon
									? "Data Cleared! Redirecting..."
									: "Account Deleted! Redirecting..."}
							</span>
						</>
					) : clearing ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							<span>Processing...</span>
						</>
					) : (
						<>
							<Trash2 className="h-4 w-4" />
							<span>{isAnon ? "Clear Data" : "Delete Account"}</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
}
