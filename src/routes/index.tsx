import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

interface InProgressAttempt {
	id: string;
	examId: string;
	examTitle: string;
	subject: string;
	totalQuestions: number;
	lastActiveAt: string;
}

function HomePage() {
	const { data: session, isPending } = useSession();
	const [inProgress, setInProgress] = useState<InProgressAttempt[]>([]);

	const user = session?.user as any;
	const displayName = user?.displayName || user?.name || null;

	useEffect(() => {
		fetch("/api/attempts?inProgress=true")
			.then((res) => (res.ok ? res.json() : { attempts: [] }))
			.then((data) => {
				setInProgress(data.attempts || []);
			})
			.catch(() => setInProgress([]));
	}, []);

	return (
		<div className="flex flex-col items-center justify-start md:justify-center min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 py-6 sm:py-10 md:py-12 max-w-4xl mx-auto animate-fade-in">
			{/* ── Welcome Hero ─────────────────────────────────────────────────── */}
			<div className="text-center max-w-2xl w-full">
				{isPending ? (
					<div className="h-9 sm:h-12 w-48 sm:w-64 mx-auto rounded-xl bg-[var(--bg-surface-elevated)] animate-pulse mb-3 sm:mb-4" />
				) : (
					<h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-3 sm:mb-4">
						{displayName ? (
							<>
								Welcome back, <span>{displayName}</span>
							</>
						) : (
							<>
								Test your knowledge with{" "}
								<span className="underline decoration-[var(--border-strong)] decoration-2">
									GEN
								</span>
							</>
						)}
					</h1>
				)}

				<p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] mb-5 sm:mb-8 max-w-lg mx-auto leading-relaxed">
					Instantly generate custom exams on any topic with intelligent AI,
					practice with instant grading, and explore thousands of questions
					created by others.
				</p>

				{/* ── Primary & Secondary CTAs ───────────────────────────────────── */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3.5">
					<Link
						to="/generate"
						className="w-full sm:w-auto inline-flex items-center justify-center btn-primary px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold no-underline shadow-md"
					>
						<span>Generate New Exam</span>
					</Link>
					<Link
						to="/discover"
						className="w-full sm:w-auto inline-flex items-center justify-center btn-secondary px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium no-underline"
					>
						<span>Explore Exams</span>
					</Link>
				</div>
			</div>

			{/* ── Pick Up Where You Left Off ──────────────────────────────────── */}
			{inProgress.length > 0 && (
				<div className="mt-8 sm:mt-14 w-full">
					<div className="flex items-center justify-between mb-2.5 sm:mb-3 px-1">
						<h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Pick up where you left off
						</h2>
						<span className="text-[10px] sm:text-[11px] text-[var(--text-muted)]">
							{inProgress.length} active{" "}
							{inProgress.length === 1 ? "attempt" : "attempts"}
						</span>
					</div>

					<div className="grid gap-2 sm:gap-2.5">
						{inProgress.map((item) => (
							<Link
								key={item.id}
								to="/practice/$attemptId"
								params={{ attemptId: item.id }}
								search={{ batch: "1", mode: "exam" }}
								className="gen-card gen-card-hover flex items-center justify-between p-3 sm:p-4 no-underline group"
							>
								<div className="min-w-0 flex-1 pr-3 sm:pr-4">
									<div className="flex items-center gap-2 mb-1">
										<span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold badge-neutral">
											{item.subject}
										</span>
										<span className="text-[11px] sm:text-xs text-[var(--text-muted)]">
											{item.totalQuestions} questions
										</span>
									</div>
									<h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
										{item.examTitle}
									</h3>
								</div>

								<div className="flex items-center gap-2 sm:gap-3 shrink-0">
									<span className="text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
										Resume <ArrowRight className="h-3.5 w-3.5" />
									</span>
								</div>
							</Link>
						))}
					</div>
				</div>
			)}

			{/* ── Quick Platform Highlights ──────────────────────────────────── */}
			<div className="mt-8 sm:mt-12 w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
				<div className="gen-card gen-card-hover p-3 sm:px-4 sm:py-3 text-left">
					<h4 className="text-xs font-semibold text-[var(--text-primary)]">
						Custom Generation
					</h4>
					<p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5">
						Any subject, depth, or topic
					</p>
				</div>

				<div className="gen-card gen-card-hover p-3 sm:px-4 sm:py-3 text-left">
					<h4 className="text-xs font-semibold text-[var(--text-primary)]">
						Instant Grading
					</h4>
					<p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5">
						Real-time scoring & feedback
					</p>
				</div>

				<div className="gen-card gen-card-hover p-3 sm:px-4 sm:py-3 text-left">
					<h4 className="text-xs font-semibold text-[var(--text-primary)]">
						AI Tutor Explanations
					</h4>
					<p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5">
						Deep-dive on wrong answers
					</p>
				</div>
			</div>
		</div>
	);
}
