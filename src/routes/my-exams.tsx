import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Loader2, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PracticeSetupModal from "#/components/PracticeSetupModal";
import { useUserStore } from "#/stores/useUserStore";

export const Route = createFileRoute("/my-exams")({ component: MyExamsPage });

interface UserExam {
	id: string;
	title: string;
	subject: string;
	description: string;
	difficulty: "easy" | "medium" | "hard";
	questionCount: number;
	createdAt: string;
}

function MyExamsPage() {
	const navigate = useNavigate();
	const [exams, setExams] = useState<UserExam[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [selectedExamForPractice, setSelectedExamForPractice] =
		useState<UserExam | null>(null);
	const [startingPractice, setStartingPractice] = useState(false);

	const fetchMyExams = useCallback(() => {
		fetch("/api/exams")
			.then((res) => (res.ok ? res.json() : { exams: [] }))
			.then((data) => setExams(data.exams || []))
			.catch(() => setExams([]))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		fetchMyExams();
	}, [fetchMyExams]);

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm("Are you sure you want to delete this exam?")) return;

		setDeletingId(id);
		try {
			const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
			if (res.ok) {
				setExams((prev) => prev.filter((x) => x.id !== id));
				await useUserStore
					.getState()
					.invalidateAndRefresh()
					.catch(() => {});
			}
		} catch (_err) {
			alert("Failed to delete exam.");
		} finally {
			setDeletingId(null);
		}
	};

	const handleStartPractice = async (
		batch: "all" | "5" | "1",
		mode: "instant" | "exam",
	) => {
		if (!selectedExamForPractice) return;
		setStartingPractice(true);

		try {
			const res = await fetch("/api/attempts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ examId: selectedExamForPractice.id }),
			});

			const data = await res.json();
			if (!res.ok)
				throw new Error(data.error || "Failed to start practice session.");

			setSelectedExamForPractice(null);
			navigate({
				to: "/practice/$attemptId",
				params: { attemptId: data.attemptId },
				search: {
					batch,
					mode,
				},
			});
		} catch (err: any) {
			alert(err.message || "Failed to start practice session.");
		} finally {
			setStartingPractice(false);
		}
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in space-y-6 sm:space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
				<div>
					<h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
						My Generated Exams
					</h1>
					<p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
						Access, practice, and manage all exams generated in your workspace.
					</p>
				</div>

				<Link
					to="/generate"
					className="btn-primary text-xs self-start no-underline font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2"
				>
					<span>New Exam</span>
				</Link>
			</div>

			{/* Grid */}
			{loading ? (
				<div className="py-20 flex flex-col items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
					<p className="text-xs text-[var(--text-secondary)]">
						Retrieving your exams...
					</p>
				</div>
			) : exams.length === 0 ? (
				<div className="gen-card p-8 sm:p-12 text-center max-w-md mx-auto">
					<BookOpen className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
					<h3 className="text-sm font-semibold text-[var(--text-primary)]">
						No exams generated yet
					</h3>
					<p className="text-xs text-[var(--text-secondary)] mt-1 mb-5">
						Create your first test on any academic topic in seconds.
					</p>
					<Link
						to="/generate"
						className="btn-primary text-xs inline-flex items-center no-underline px-4 py-2"
					>
						<span>Generate Exam</span>
					</Link>
				</div>
			) : (
				/* App-Style 2-column Grid on Mobile, 2 on MD, 3 on LG */
				<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
					{exams.map((ex) => (
						<div
							key={ex.id}
							className="gen-card gen-card-hover p-3 sm:p-5 flex flex-col justify-between"
						>
							<div>
								<div className="flex items-center justify-between gap-1.5 mb-2">
									<span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold badge-neutral truncate max-w-[80px] sm:max-w-none">
										{ex.subject}
									</span>
									<span
										className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold capitalize shrink-0 ${
											ex.difficulty === "easy"
												? "badge-success"
												: ex.difficulty === "medium"
													? "badge-warning"
													: "badge-danger"
										}`}
									>
										{ex.difficulty}
									</span>
								</div>

								<Link
									to="/exam/$examId"
									params={{ examId: ex.id }}
									className="font-heading text-xs sm:text-base font-bold text-[var(--text-primary)] mb-1 sm:mb-1.5 line-clamp-2 no-underline hover:underline cursor-pointer block leading-snug"
								>
									{ex.title}
								</Link>

								<p className="text-[10px] sm:text-xs text-[var(--text-secondary)] line-clamp-2 mb-2.5 sm:mb-4 leading-relaxed">
									{ex.description ||
										"Custom generated practice questions and explanations."}
								</p>
							</div>

							<div className="pt-2 sm:pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
								<span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium truncate">
									{ex.questionCount}Q
								</span>

								<div className="flex items-center gap-1 sm:gap-2 shrink-0">
									<button
										type="button"
										onClick={(e) => handleDelete(ex.id, e)}
										disabled={deletingId === ex.id}
										className="p-1 sm:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer"
										title="Delete Exam"
									>
										{deletingId === ex.id ? (
											<Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
										) : (
											<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
										)}
									</button>

									<button
										type="button"
										onClick={() => setSelectedExamForPractice(ex)}
										className="btn-primary text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 font-semibold cursor-pointer shrink-0"
									>
										<Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
										<span>Practice</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Unified Practice Launch Setup Modal (Portaled to Body) */}
			<PracticeSetupModal
				open={!!selectedExamForPractice}
				onClose={() => setSelectedExamForPractice(null)}
				onStart={handleStartPractice}
				starting={startingPractice}
				examTitle={selectedExamForPractice?.title}
				totalQuestions={selectedExamForPractice?.questionCount}
			/>
		</div>
	);
}
