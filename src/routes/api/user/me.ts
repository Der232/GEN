import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { type Attempt, attempts, exams } from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/user/me")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ user: null }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					const userId = session.user.id;

					// Calculate stats concurrently
					const [userExams, completedAttempts] = await Promise.all([
						db.query.exams.findMany({
							where: eq(exams.userId, userId),
						}),
						db.query.attempts.findMany({
							where: and(
								eq(attempts.userId, userId),
								eq(attempts.status, "completed"),
							),
						}),
					]);

					const totalScore = completedAttempts.reduce(
						(acc: number, curr: Attempt) => acc + (curr.score || 0),
						0,
					);
					const avgScore =
						completedAttempts.length > 0
							? Math.round(totalScore / completedAttempts.length)
							: 0;

					return new Response(
						JSON.stringify({
							user: session.user,
							stats: {
								examsCreated: userExams.length,
								examsTaken: completedAttempts.length,
								averageScore: avgScore,
							},
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
		},
	},
});
