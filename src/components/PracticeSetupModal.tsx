import { AlertTriangle, Loader2, Play, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface PracticeSetupModalProps {
	open: boolean;
	onClose: () => void;
	onStart: (
		batch: "all" | "5" | "1",
		mode: "instant" | "exam",
	) => Promise<void> | void;
	starting?: boolean;
	examTitle?: string;
	totalQuestions?: number;
}

export default function PracticeSetupModal({
	open,
	onClose,
	onStart,
	starting = false,
	examTitle,
	totalQuestions,
}: PracticeSetupModalProps) {
	const [mounted, setMounted] = useState(false);
	const [batch, setBatch] = useState<"all" | "5" | "1">("all");
	const [mode, setMode] = useState<"instant" | "exam">("instant");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!open || !mounted || typeof document === "undefined") {
		return null;
	}

	const handleStart = () => {
		onStart(batch, mode);
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget && !starting) onClose();
			}}
		>
			<div
				className="gen-card max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] animate-scale-up overflow-y-auto max-h-[92vh] sm:max-h-none"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-2.5 sm:gap-3">
					<div>
						<h3 className="text-sm sm:text-base md:text-lg font-bold text-[var(--text-primary)]">
							Practice Session Setup
						</h3>
						<p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
							{examTitle
								? examTitle
								: "Configure question delivery and grading system"}
						</p>
					</div>
					<button
						type="button"
						disabled={starting}
						onClick={onClose}
						className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 sm:p-1.5 rounded-lg transition hover:bg-[var(--bg-surface-elevated)] cursor-pointer disabled:opacity-50"
						title="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Section 1: Question Delivery */}
				<div className="space-y-1.5 sm:space-y-2">
					<div className="flex items-center justify-between">
						<label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
							Question Delivery
						</label>
						{totalQuestions && (
							<span className="text-[10px] sm:text-[11px] text-[var(--text-muted)]">
								{totalQuestions} questions total
							</span>
						)}
					</div>
					<div className="grid grid-cols-3 gap-1.5 sm:gap-2">
						{[
							{
								id: "all",
								label: totalQuestions
									? `All (${totalQuestions}Q)`
									: "All at once",
							},
							{ id: "5", label: "5 at a time" },
							{ id: "1", label: "1 at a time" },
						].map((b) => (
							<button
								key={b.id}
								type="button"
								onClick={() => setBatch(b.id as any)}
								className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium border text-center transition cursor-pointer ${
									batch === b.id
										? "btn-primary font-bold shadow-xs"
										: "btn-secondary text-[var(--text-secondary)]"
								}`}
							>
								{b.label}
							</button>
						))}
					</div>
				</div>

				{/* Section 2: Grading & Feedback System */}
				<div className="space-y-1.5 sm:space-y-2">
					<label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
						Grading & Feedback Mode
					</label>
					<div className="grid grid-cols-1 gap-2 sm:gap-2.5">
						{/* Instant Feedback Mode */}
						<button
							type="button"
							onClick={() => setMode("instant")}
							className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 sm:gap-3 ${
								mode === "instant"
									? "bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] ring-1 ring-[var(--border-strong)]"
									: "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
							}`}
						>
							<div className="mt-0.5">
								<div
									className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border flex items-center justify-center shrink-0 ${
										mode === "instant"
											? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]"
											: "border-[var(--border-strong)]"
									}`}
								>
									{mode === "instant" && (
										<div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />
									)}
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
									<Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
									<span className="truncate">Instant Feedback Mode</span>
									<span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded badge-success font-semibold shrink-0">
										Recommended
									</span>
								</div>
								<p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 sm:mt-1 leading-relaxed">
									Validates choices immediately upon selection, displays key
									explanations, and unlocks on-demand AI tutor proofs on each
									question.
								</p>
							</div>
						</button>

						{/* Exam Mode */}
						<button
							type="button"
							onClick={() => setMode("exam")}
							className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 sm:gap-3 ${
								mode === "exam"
									? "bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] ring-1 ring-[var(--border-strong)]"
									: "bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
							}`}
						>
							<div className="mt-0.5">
								<div
									className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border flex items-center justify-center shrink-0 ${
										mode === "exam"
											? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]"
											: "border-[var(--border-strong)]"
									}`}
								>
									{mode === "exam" && (
										<div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />
									)}
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
									<AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[var(--color-warning)] shrink-0" />
									<span className="truncate">Exam Mode</span>
								</div>
								<p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 sm:mt-1 leading-relaxed">
									Timed / silent test conditions. Keeps answers hidden until
									submission, then delivers full score and detailed analytics at
									the end.
								</p>
							</div>
						</button>
					</div>
				</div>

				{/* Modal Actions */}
				<div className="flex items-center justify-end gap-2 sm:gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
					<button
						type="button"
						onClick={onClose}
						disabled={starting}
						className="btn-secondary px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs cursor-pointer disabled:opacity-50 font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleStart}
						disabled={starting}
						className="btn-primary px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 cursor-pointer font-semibold shadow-sm disabled:opacity-50"
					>
						{starting ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								<span>Preparing Session...</span>
							</>
						) : (
							<>
								<Play className="h-3.5 w-3.5 fill-current" />
								<span>Start Practice Now</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
