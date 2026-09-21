import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db";
import {
	type AttemptAnswer,
	attemptAnswers,
	attempts,
	exams,
	type Question,
	questions,
} from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/attempts/$id")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				try {
					const { id } = params;
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized. Please sign in." }),
							{
								status: 401,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const attempt = await db.query.attempts.findFirst({
						where: eq(attempts.id, id),
					});

					if (!attempt) {
						return new Response(
							JSON.stringify({ error: "Attempt not found" }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (attempt.userId !== session.user.id) {
						return new Response(
							JSON.stringify({
								error: "Forbidden. You do not have access to this attempt.",
							}),
							{
								status: 403,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const [exam, qList, answers] = await Promise.all([
						db.query.exams.findFirst({
							where: eq(exams.id, attempt.examId),
						}),
						db.query.questions.findMany({
							where: eq(questions.examId, attempt.examId),
							orderBy: [asc(questions.order)],
						}),
						db.query.attemptAnswers.findMany({
							where: eq(attemptAnswers.attemptId, id),
						}),
					]);

					const formattedQuestions = qList.map((q: Question) => ({
						...q,
						options: q.options ? JSON.parse(q.options) : null,
					}));

					return new Response(
						JSON.stringify({
							attempt,
							exam,
							questions: formattedQuestions,
							answers,
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				} catch (error: any) {
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			},

			POST: async ({ params, request }) => {
				try {
					const { id } = params;
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized. Please sign in." }),
							{
								status: 401,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const body = await request.json();
					const { action, questionId, userAnswer } = body;

					const attempt = await db.query.attempts.findFirst({
						where: eq(attempts.id, id),
					});

					if (!attempt) {
						return new Response(
							JSON.stringify({ error: "Attempt not found" }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (attempt.userId !== session.user.id) {
						return new Response(
							JSON.stringify({
								error: "Forbidden. You cannot modify this attempt.",
							}),
							{
								status: 403,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Action 1: Save individual answer
					if (action === "answer") {
						if (attempt.status === "completed") {
							return new Response(
								JSON.stringify({ error: "Cannot modify a completed attempt." }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const q = await db.query.questions.findFirst({
							where: and(
								eq(questions.id, questionId),
								eq(questions.examId, attempt.examId),
							),
						});

						if (!q) {
							return new Response(
								JSON.stringify({
									error: "Question not found or does not belong to this exam.",
								}),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const isCorrect =
							userAnswer.trim().toLowerCase() ===
							q.correctAnswer.trim().toLowerCase();

						// Upsert answer for this specific attempt
						const existingAnswer = await db.query.attemptAnswers.findFirst({
							where: and(
								eq(attemptAnswers.attemptId, id),
								eq(attemptAnswers.questionId, questionId),
							),
						});

						if (existingAnswer) {
							await db
								.update(attemptAnswers)
								.set({
									userAnswer,
									isCorrect,
									answeredAt: new Date(),
								})
								.where(eq(attemptAnswers.id, existingAnswer.id));
						} else {
							await db.insert(attemptAnswers).values({
								id: `ans_${crypto.randomUUID()}`,
								attemptId: id,
								questionId,
								userAnswer,
								isCorrect,
								answeredAt: new Date(),
							});
						}

						await db
							.update(attempts)
							.set({ lastActiveAt: new Date() })
							.where(eq(attempts.id, id));

						return new Response(JSON.stringify({ success: true, isCorrect }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Action 2: Final Submit
					if (action === "submit") {
						// Idempotency guard: return existing score if already submitted
						if (attempt.status === "completed") {
							return new Response(
								JSON.stringify({
									success: true,
									score: attempt.score ?? 0,
									correctCount: attempt.correctCount ?? 0,
									totalQuestions: attempt.totalQuestions,
								}),
								{
									status: 200,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const [allAnswers, qList] = await Promise.all([
							db.query.attemptAnswers.findMany({
								where: eq(attemptAnswers.attemptId, id),
							}),
							db.query.questions.findMany({
								where: eq(questions.examId, attempt.examId),
							}),
						]);

						const total = qList.length;
						const correct = allAnswers.filter(
							(a: AttemptAnswer) => a.isCorrect,
						).length;
						const score = total > 0 ? Math.round((correct / total) * 100) : 0;

						await db
							.update(attempts)
							.set({
								status: "completed",
								score,
								correctCount: correct,
								completedAt: new Date(),
								lastActiveAt: new Date(),
							})
							.where(eq(attempts.id, id));

						return new Response(
							JSON.stringify({
								success: true,
								score,
								correctCount: correct,
								totalQuestions: total,
							}),
							{
								status: 200,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					return new Response(JSON.stringify({ error: "Invalid action" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error: any) {
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
