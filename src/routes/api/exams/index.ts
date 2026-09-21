import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { db } from "#/db";
import { documents, exams, questions } from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/exams/")({
	server: {
		handlers: {
			// ─── GET /api/exams — List public exams or user's exams ────────────────
			GET: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const isDiscover = url.searchParams.get("discover") === "true";
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (isDiscover) {
						// Return public community exams
						const publicExams = await db.query.exams.findMany({
							where: eq(exams.isPublic, true),
							orderBy: [desc(exams.createdAt)],
							limit: 50,
						});
						return new Response(JSON.stringify({ exams: publicExams }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Otherwise, user's own exams
					if (!session?.user) {
						return new Response(JSON.stringify({ exams: [] }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					const userExams = await db.query.exams.findMany({
						where: eq(exams.userId, session.user.id),
						orderBy: [desc(exams.createdAt)],
					});

					return new Response(JSON.stringify({ exams: userExams }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error: any) {
					console.error("Error fetching exams:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			},

			// ─── POST /api/exams — Save a newly generated exam ─────────────────────
			POST: async ({ request }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});
					const body = await request.json();
					const { exam, questions: qList } = body;

					if (!exam || !qList || !Array.isArray(qList)) {
						return new Response(
							JSON.stringify({ error: "Invalid exam payload" }),
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

					const userId = session.user.id;
					const authorDisplayName =
						session.user.name || (session.user as any)?.displayName;

					const examId = `exam_${crypto.randomUUID()}`;

					// Verify documentId belongs to the current user if provided
					let validDocumentId: string | null = null;
					if (exam.documentId) {
						const doc = await db.query.documents.findFirst({
							where: and(
								eq(documents.id, exam.documentId),
								eq(documents.userId, userId),
							),
						});
						if (doc) {
							validDocumentId = doc.id;
						}
					}

					// Insert exam
					await db.insert(exams).values({
						id: examId,
						userId,
						documentId: validDocumentId,
						authorDisplayName,
						title: exam.title,
						subject: exam.subject,
						description: exam.description || "",
						difficulty: exam.difficulty,
						questionCount: qList.length,
						isPublic: true, // auto-public as planned
						tags: JSON.stringify(exam.tags || []),
					});

					// Batch insert all questions in a single query
					if (qList.length > 0) {
						await db.insert(questions).values(
							qList.map((q: any, i: number) => ({
								id: `q_${crypto.randomUUID()}`,
								examId,
								order: q.order ?? i + 1,
								type: q.type,
								question: q.question,
								options: q.options ? JSON.stringify(q.options) : null,
								correctAnswer: q.correctAnswer,
								explanation: q.explanation || "",
							})),
						);
					}

					return new Response(JSON.stringify({ success: true, examId }), {
						status: 201,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error: any) {
					console.error("Error saving exam:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
