import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { db } from "#/db";
import { attempts, exams } from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/attempts/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});
					const url = new URL(request.url);
					const inProgressOnly = url.searchParams.get("inProgress") === "true";

					if (!session?.user) {
						return new Response(JSON.stringify({ attempts: [] }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					const conditions = inProgressOnly
						? and(
								eq(attempts.userId, session.user.id),
								eq(attempts.status, "in-progress"),
							)
						: eq(attempts.userId, session.user.id);

					const rows = await db
						.select({
							attempt: attempts,
							examTitle: exams.title,
							subject: exams.subject,
						})
						.from(attempts)
						.leftJoin(exams, eq(attempts.examId, exams.id))
						.where(conditions)
						.orderBy(desc(attempts.lastActiveAt))
						.limit(10);

					const enriched = rows.map((r) => ({
						...r.attempt,
						examTitle: r.examTitle || "Untitled Exam",
						subject: r.subject || "General",
					}));

					return new Response(JSON.stringify({ attempts: enriched }), {
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

			POST: async ({ request }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});
					const body = await request.json();
					const { examId } = body;

					if (!examId) {
						return new Response(
							JSON.stringify({ error: "examId is required" }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

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
						where: eq(exams.id, examId),
					});

					if (!exam) {
						return new Response(JSON.stringify({ error: "Exam not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					if (!exam.isPublic && exam.userId !== session.user.id) {
						return new Response(
							JSON.stringify({ error: "Forbidden. This exam is private." }),
							{
								status: 403,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const userId = session.user.id;
					const attemptId = `att_${crypto.randomUUID()}`;

					await db.insert(attempts).values({
						id: attemptId,
						examId,
						userId,
						status: "in-progress",
						totalQuestions: exam.questionCount,
						score: null,
						correctCount: 0,
					});

					return new Response(JSON.stringify({ attemptId }), {
						status: 201,
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
