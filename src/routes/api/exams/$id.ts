import { createFileRoute } from "@tanstack/react-router";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "#/db";
import {
	attemptAnswers,
	attempts,
	exams,
	type Question,
	questions,
} from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/exams/$id")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				try {
					const { id } = params;

					const exam = await db.query.exams.findFirst({
						where: eq(exams.id, id),
					});

					if (!exam) {
						return new Response(JSON.stringify({ error: "Exam not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					if (!exam.isPublic) {
						const session = await auth.api.getSession({
							headers: request.headers,
						});
						if (!session?.user || session.user.id !== exam.userId) {
							return new Response(
								JSON.stringify({ error: "Forbidden. This exam is private." }),
								{
									status: 403,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					}

					const qList = await db.query.questions.findMany({
						where: eq(questions.examId, id),
						orderBy: [asc(questions.order)],
					});

					const formattedQuestions = qList.map((q: Question) => ({
						...q,
						options: q.options ? JSON.parse(q.options) : null,
					}));

					return new Response(
						JSON.stringify({
							exam: {
								...exam,
								tags: exam.tags ? JSON.parse(exam.tags) : [],
							},
							questions: formattedQuestions,
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

			DELETE: async ({ params, request }) => {
				try {
					const { id } = params;
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({
								error: "Unauthorized. An active session is required.",
							}),
							{
								status: 401,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const exam = await db.query.exams.findFirst({
						where: eq(exams.id, id),
					});

					if (!exam) {
						return new Response(JSON.stringify({ error: "Exam not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					if (exam.userId !== session.user.id) {
						return new Response(
							JSON.stringify({ error: "Forbidden. You do not own this exam." }),
							{
								status: 403,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Maintain clean referential integrity: delete attempt answers, attempts, questions, then exam
					const examAttempts = await db.query.attempts.findMany({
						where: eq(attempts.examId, id),
					});

					if (examAttempts.length > 0) {
						const attemptIds = examAttempts.map((a) => a.id);
						await db
							.delete(attemptAnswers)
							.where(inArray(attemptAnswers.attemptId, attemptIds));
						await db.delete(attempts).where(eq(attempts.examId, id));
					}

					await db.delete(questions).where(eq(questions.examId, id));
					await db.delete(exams).where(eq(exams.id, id));

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
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
