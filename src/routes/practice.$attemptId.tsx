import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle,
	CheckCircle2,
	Loader2,
	Lock,
	Sparkles,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useExamSessionStore } from "#/stores/useExamSessionStore";
import { useUserStore } from "#/stores/useUserStore";

export const Route = createFileRoute("/practice/$attemptId")({
	component: PracticePage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			batch: search?.batch ? String(search.batch) : "1",
			mode: (search?.mode === "instant" ? "instant" : "exam") as
				| "instant"
				| "exam",
		};
	},
});

interface Question {
	id: string;
	order: number;
	type: "multiple-choice" | "true-false" | "short-answer";
	question: string;
	options?: string[] | null;
	correctAnswer: string;
	explanation?: string;
}

interface AttemptAnswer {
	questionId: string;
	userAnswer: string;
	isCorrect: boolean;
}

function PracticePage() {
	const { attemptId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();

	const rawBatch = search.batch;
	const isAllBatch = rawBatch === "all";
	const isInstantMode = search.mode === "instant";

	const [batchSize, setBatchSize] = useState<number>(() => {
		if (rawBatch === "all") return 999;
		return Math.max(Number(rawBatch) || 1, 1);
	});

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [examTitle, setExamTitle] = useState("");
	const [subject, setSubject] = useState("");
	const [questions, setQuestions] = useState<Question[]>([]);

	// AI explanations on demand for instant mode
	const [aiExplanations, setAiExplanations] = useState<Record<string, string>>(
		{},
	);
	const [explainingLoading, setExplainingLoading] = useState<
		Record<string, boolean>
	>({});

	// Zustand persistent session store
	const userAnswers = useExamSessionStore((state) => state.userAnswers);
	const currentBatchIndex = useExamSessionStore(
		(state) => state.currentBatchIndex,
	);
	const setAnswer = useExamSessionStore((state) => state.setAnswer);
	const setBatchIndex = useExamSessionStore((state) => state.setBatchIndex);
	const initSession = useExamSessionStore((state) => state.initSession);
	const clearSession = useExamSessionStore((state) => state.clearSession);

	const handleRequestExplanation = async (q: Question) => {
		const ans = userAnswers[q.id] || "";
		setExplainingLoading((prev) => ({ ...prev, [q.id]: true }));
		try {
			const res = await fetch("/api/exam/explain", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					question: q.question,
					correctAnswer: q.correctAnswer,
					userAnswer: ans,
					explanation: q.explanation || "",
				}),
			});
			const data = await res.json();
			if (data.explanation) {
				setAiExplanations((prev) => ({ ...prev, [q.id]: data.explanation }));
			}
		} catch (e) {
			console.error("Failed to get AI explanation:", e);
		} finally {
			setExplainingLoading((prev) => ({ ...prev, [q.id]: false }));
		}
	};

	useEffect(() => {
		fetch(`/api/attempts/${attemptId}`)
			.then((res) => res.json())
			.then((data) => {
				if (data.attempt?.status === "completed") {
					// Already completed, redirect to results
					navigate({ to: "/results/$attemptId", params: { attemptId } });
					return;
				}

				if (data.exam) {
					setExamTitle(data.exam.title);
					setSubject(data.exam.subject);
				}

				const effectiveBatchSize = isAllBatch
					? Math.max(data.questions?.length || 1, 1)
					: Math.max(Number(rawBatch) || 1, 1);
				setBatchSize(effectiveBatchSize);

				if (data.questions) {
					setQuestions(data.questions);
				}

				// Restore previously saved answers from backend and merge into Zustand store
				const serverAnswers: Record<string, string> = {};
				if (data.answers && Array.isArray(data.answers)) {
					data.answers.forEach((a: AttemptAnswer) => {
						serverAnswers[a.questionId] = a.userAnswer;
					});
				}

				initSession({
					attemptId,
					examId: data.exam?.id || "",
					batchSize: effectiveBatchSize,
					initialAnswers: serverAnswers,
				});
			})
			.catch((err) => console.error(err))
			.finally(() => setLoading(false));
	}, [attemptId, isAllBatch, rawBatch, initSession, navigate]);

	const currentQuestions = questions.slice(
		currentBatchIndex * batchSize,
		(currentBatchIndex + 1) * batchSize,
	);

	const totalBatches = Math.max(1, Math.ceil(questions.length / batchSize));
	const isLastBatch = currentBatchIndex >= totalBatches - 1;

	const handleSelectAnswer = async (questionId: string, answer: string) => {
		// In Instant Feedback Mode, once an answer is chosen, it is permanently locked in
		if (isInstantMode && userAnswers[questionId]) {
			return;
		}

		// 1. Update Zustand store immediately (persists to localStorage)
		setAnswer(questionId, answer);

		// 2. Persist answer to backend in background
		try {
			await fetch(`/api/attempts/${attemptId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "answer",
					questionId,
					userAnswer: answer,
				}),
			});
		} catch (err) {
			console.error("Failed to sync answer:", err);
		}
	};

	const handleAdvance = async () => {
		if (isLastBatch) {
			// Submit final exam!
			setSubmitting(true);
			try {
				const res = await fetch(`/api/attempts/${attemptId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "submit" }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Failed to submit");

				// Clear in-progress session upon successful submission
				clearSession();

				// Invalidate and refresh database performance metrics in Zustand
				await useUserStore
					.getState()
					.invalidateAndRefresh()
					.catch(() => {});

				navigate({
					to: "/results/$attemptId",
					params: { attemptId },
				});
			} catch (err: any) {
				alert(err.message || "Error submitting exam");
				setSubmitting(false);
			}
		} else {
			// Advance to next batch (persists in Zustand)
			setBatchIndex(currentBatchIndex + 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	// Check if all questions in the current batch have been answered
	const allCurrentAnswered = currentQuestions.every(
		(q) => userAnswers[q.id] && userAnswers[q.id].trim().length > 0,
	);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
				<p className="text-xs text-[var(--text-secondary)]">
					Loading practice session...
				</p>
			</div>
		);
	}

	if (questions.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4">
				<div className="h-12 w-12 rounded-full bg-[var(--color-danger-subtle)] flex items-center justify-center text-[var(--color-danger)] mb-4">
					<AlertTriangle className="h-6 w-6" />
				</div>
				<h2 className="font-heading text-lg font-bold text-[var(--text-primary)] mb-2">
					Session Unavailable
				</h2>
				<p className="text-xs text-[var(--text-muted)] mb-6">
					This practice session could not be loaded or you do not have
					permission to view it.
				</p>
				<Link
					to="/my-exams"
					className="gen-btn-primary text-xs px-4 py-2 no-underline"
				>
					Return to My Exams
				</Link>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 animate-fade-in space-y-4 sm:space-y-6">
			{/* Top Bar: Progress and Metadata */}
			<div className="gen-card p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="px-2 py-0.5 rounded text-[10px] font-bold badge-neutral">
							{subject}
						</span>
						<span className="text-xs text-[var(--text-muted)]">
							Batch {currentBatchIndex + 1} of {totalBatches}
						</span>
					</div>
					<h1 className="font-heading text-base sm:text-xl font-bold text-[var(--text-primary)] truncate max-w-lg">
						{examTitle}
					</h1>
				</div>

				{/* Progress indicator */}
				<div className="flex flex-col sm:items-end gap-1.5 shrink-0">
					<div className="text-xs font-semibold text-[var(--text-secondary)]">
						Progress:{" "}
						{Math.min((currentBatchIndex + 1) * batchSize, questions.length)} /{" "}
						{questions.length} Questions
					</div>
					<div className="w-full sm:w-36 h-2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] overflow-hidden">
						<div
							className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-300"
							style={{
								width: `${Math.round(
									(((currentBatchIndex + 1) * batchSize) / questions.length) *
										100,
								)}%`,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Notice on exam rules */}
			<div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
				{isInstantMode ? (
					<>
						<Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
						<span>
							<strong>Instant Feedback Mode:</strong> Answers are permanently
							locked in upon selection with instant verification and AI
							tutoring.
						</span>
					</>
				) : (
					<>
						<AlertTriangle className="h-4 w-4 text-[var(--color-warning)] shrink-0" />
						<span>
							<strong>Exam Mode:</strong> You can adjust answers freely within
							the current batch. Once a batch is submitted, answers are
							permanently locked in and you cannot go back.
						</span>
					</>
				)}
			</div>

			{/* Current Questions List */}
			<div className="space-y-5">
				{currentQuestions.map((q, idx) => {
					const globalNumber = currentBatchIndex * batchSize + idx + 1;
					const selectedAnswer = userAnswers[q.id] || "";

					const isQuestionLocked = isInstantMode && Boolean(selectedAnswer);

					return (
						<div
							key={q.id}
							className="gen-card p-4 sm:p-6 space-y-3.5 sm:space-y-4"
						>
							<div className="flex items-start gap-2.5 sm:gap-3">
								<span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[11px] sm:text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-[var(--border-strong)]">
									{globalNumber}
								</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2 mb-1">
										<span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
											{q.type.replace("-", " ")}
										</span>
										{isQuestionLocked && (
											<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md animate-fade-in">
												<Lock className="h-3 w-3 text-amber-500" />
												<span>Answer Locked</span>
											</span>
										)}
									</div>
									<h2 className="text-xs sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
										{q.question}
									</h2>
								</div>
							</div>

							{/* Multiple Choice Options */}
							{q.type === "multiple-choice" && q.options && (
								<div className="grid gap-2 sm:gap-2.5 pt-1 sm:pt-2 pl-0 sm:pl-9">
									{q.options.map((opt) => {
										const isSelected = selectedAnswer === opt;
										const isCorrectAnswer =
											opt.trim().toLowerCase() ===
											q.correctAnswer.trim().toLowerCase();

										let buttonClass =
											"bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]";

										if (isInstantMode && selectedAnswer) {
											if (isSelected) {
												buttonClass = isCorrectAnswer
													? "bg-[var(--color-success-subtle)] border-2 border-emerald-500 text-[var(--color-success)] font-bold ring-1 ring-emerald-500 cursor-default"
													: "bg-[var(--color-danger-subtle)] border-2 border-red-500 text-[var(--color-danger)] font-bold ring-1 ring-red-500 cursor-default";
											} else if (isCorrectAnswer) {
												buttonClass =
													"bg-[var(--bg-surface-elevated)] border border-emerald-500/50 text-[var(--color-success)] font-semibold cursor-default";
											} else {
												buttonClass =
													"bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-default";
											}
										} else if (isSelected) {
											buttonClass =
												"bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] text-[var(--text-primary)] font-semibold shadow-sm ring-1 ring-[var(--border-strong)]";
										}

										return (
											<button
												key={opt}
												type="button"
												disabled={isQuestionLocked}
												onClick={() => {
													if (!isQuestionLocked) {
														handleSelectAnswer(q.id, opt);
													}
												}}
												className={`w-full p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between text-left transition-all ${
													isQuestionLocked ? "cursor-default" : "cursor-pointer"
												} ${buttonClass}`}
											>
												<span className="pr-2 sm:pr-3">{opt}</span>
												<div className="shrink-0 flex items-center gap-1.5">
													{isInstantMode &&
														selectedAnswer &&
														isSelected &&
														(isCorrectAnswer ? (
															<CheckCircle2 className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
														) : (
															<XCircle className="h-4 w-4 text-red-500 stroke-[2.5]" />
														))}
													{isInstantMode &&
														selectedAnswer &&
														!isSelected &&
														isCorrectAnswer && (
															<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
																Correct Key
															</span>
														)}
													{!isInstantMode && (
														<div
															className={`h-4 w-4 rounded-full border flex items-center justify-center ${
																isSelected
																	? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]"
																	: "border-[var(--border-strong)]"
															}`}
														>
															{isSelected && (
																<div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />
															)}
														</div>
													)}
												</div>
											</button>
										);
									})}
								</div>
							)}

							{/* True / False Options */}
							{q.type === "true-false" && (
								<div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1 sm:pt-2 pl-0 sm:pl-9">
									{["True", "False"].map((val) => {
										const isSelected =
											selectedAnswer.toLowerCase() === val.toLowerCase();
										const isCorrectAnswer =
											val.toLowerCase() === q.correctAnswer.toLowerCase();

										let buttonClass =
											"bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]";

										if (isInstantMode && selectedAnswer) {
											if (isSelected) {
												buttonClass = isCorrectAnswer
													? "bg-[var(--color-success-subtle)] border-2 border-emerald-500 text-[var(--color-success)] font-bold ring-1 ring-emerald-500 cursor-default"
													: "bg-[var(--color-danger-subtle)] border-2 border-red-500 text-[var(--color-danger)] font-bold ring-1 ring-red-500 cursor-default";
											} else if (isCorrectAnswer) {
												buttonClass =
													"bg-[var(--bg-surface-elevated)] border border-emerald-500/50 text-[var(--color-success)] font-semibold cursor-default";
											} else {
												buttonClass =
													"bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-default";
											}
										} else if (isSelected) {
											buttonClass =
												"bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] text-[var(--text-primary)] ring-1 ring-[var(--border-strong)] font-bold";
										}

										return (
											<button
												key={val}
												type="button"
												disabled={isQuestionLocked}
												onClick={() => {
													if (!isQuestionLocked) {
														handleSelectAnswer(q.id, val);
													}
												}}
												className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-center border flex items-center justify-center gap-2 ${
													isQuestionLocked ? "cursor-default" : "cursor-pointer"
												} ${buttonClass}`}
											>
												<span>{val}</span>
												{isInstantMode &&
													selectedAnswer &&
													isSelected &&
													(isCorrectAnswer ? (
														<CheckCircle2 className="h-4 w-4 text-emerald-500" />
													) : (
														<XCircle className="h-4 w-4 text-red-500" />
													))}
											</button>
										);
									})}
								</div>
							)}

							{/* Short Answer Input */}
							{q.type === "short-answer" && (
								<div className="pt-1 sm:pt-2 pl-0 sm:pl-9">
									<textarea
										rows={2}
										value={selectedAnswer}
										disabled={isQuestionLocked}
										readOnly={isQuestionLocked}
										onChange={(e) => {
											if (!isQuestionLocked) {
												handleSelectAnswer(q.id, e.target.value);
											}
										}}
										placeholder="Type your concise conceptual answer..."
										className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] transition resize-none disabled:opacity-75 disabled:cursor-default"
									/>
								</div>
							)}

							{/* Instant Feedback & AI Explanation on selection */}
							{isInstantMode && selectedAnswer && (
								<div className="space-y-3 pt-2 pl-9 animate-fade-in">
									{/* Feedback Banner */}
									<div
										className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
											selectedAnswer.trim().toLowerCase() ===
											q.correctAnswer.trim().toLowerCase()
												? "bg-[var(--color-success-subtle)] border-emerald-500/30 text-[var(--color-success)]"
												: "bg-[var(--color-danger-subtle)] border-red-500/30 text-[var(--color-danger)]"
										}`}
									>
										{selectedAnswer.trim().toLowerCase() ===
										q.correctAnswer.trim().toLowerCase() ? (
											<>
												<CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.5]" />
												<span>Correct! Great comprehension.</span>
											</>
										) : (
											<>
												<XCircle className="h-4 w-4 shrink-0 stroke-[2.5]" />
												<span>
													Incorrect. Correct answer:{" "}
													<strong className="ml-1">{q.correctAnswer}</strong>
												</span>
											</>
										)}
									</div>

									{/* Base Concise Explanation */}
									{q.explanation && (
										<div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
											<span className="font-semibold text-[var(--text-primary)]">
												Explanation:{" "}
											</span>
											{q.explanation}
										</div>
									)}

									{/* AI Tutor On-Demand Button & Breakdown */}
									<div className="pt-1">
										{!aiExplanations[q.id] ? (
											<button
												type="button"
												onClick={() => handleRequestExplanation(q)}
												disabled={explainingLoading[q.id]}
												className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-medium hover:border-[var(--border-strong)]"
											>
												{explainingLoading[q.id] ? (
													<>
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
														<span>AI Tutor is analyzing...</span>
													</>
												) : (
													<>
														<Sparkles className="h-3.5 w-3.5 text-amber-500" />
														<span>Explain with AI</span>
													</>
												)}
											</button>
										) : (
											<div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2 animate-fade-in">
												<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
													<Sparkles className="h-3.5 w-3.5 text-amber-500" />
													<span>AI Tutor Explanation</span>
												</div>
												<p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
													{aiExplanations[q.id]}
												</p>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Bottom Actions Bar */}
			<div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
				<p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
					{!allCurrentAnswered ? (
						<span className="text-[var(--color-warning)] font-medium">
							Please answer all questions in this batch before advancing.
						</span>
					) : !isLastBatch ? (
						<span className="text-[var(--text-secondary)]">
							Submitting this batch will permanently lock these answers.
						</span>
					) : null}
				</p>

				<button
					type="button"
					onClick={handleAdvance}
					disabled={!allCurrentAnswered || submitting}
					className="w-full sm:w-auto btn-primary py-2.5 sm:py-3 px-4 sm:px-6 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ml-auto shadow-md"
				>
					{submitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							<span>Scoring Exam...</span>
						</>
					) : isLastBatch ? (
						<>
							<CheckCircle className="h-4 w-4" />
							<span>Submit Exam & View Results</span>
						</>
					) : (
						<>
							<span>
								{batchSize === 1
									? "Submit Answer & Next Question"
									: "Submit Batch & Continue"}
							</span>
							<ArrowRight className="h-4 w-4" />
						</>
					)}
				</button>
			</div>
		</div>
	);
}
