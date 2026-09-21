// @ts-expect-error
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import {
	account,
	attemptAnswers,
	attempts,
	documents,
	exams,
	questions,
	session,
	user,
} from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/user/delete")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const authSession = await auth.api.getSession({
						headers: request.headers,
					});

					if (!authSession?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const userId = authSession.user.id;
					const isAnon = Boolean((authSession.user as any).isAnonymous);

					// 1. Handle user's exams:
					// Public exams: preserve in Discover and keep authorDisplayName intact, anonymize userId reference
					await db
						.update(exams)
						.set({ userId: "anonymized" })
						.where(and(eq(exams.userId, userId), eq(exams.isPublic, true)));

					// Non-public exams: delete questions and exams
					const privateExams = await db.query.exams.findMany({
						where: and(eq(exams.userId, userId), eq(exams.isPublic, false)),
					});

					for (const privExam of privateExams) {
						await db.delete(questions).where(eq(questions.examId, privExam.id));
						await db.delete(exams).where(eq(exams.id, privExam.id));
					}

					// 2. Handle user's attempts & answers:
					const userAttempts = await db.query.attempts.findMany({
						where: eq(attempts.userId, userId),
					});

					for (const att of userAttempts) {
						await db
							.delete(attemptAnswers)
							.where(eq(attemptAnswers.attemptId, att.id));
						await db.delete(attempts).where(eq(attempts.id, att.id));
					}

					// 3. Handle user's uploaded documents and storage in R2:
					const userDocs = await db.query.documents.findMany({
						where: eq(documents.userId, userId),
					});

					const bucket =
						(env as any)?.DOCUMENTS_BUCKET ||
						(globalThis as any).DOCUMENTS_BUCKET;
					for (const doc of userDocs) {
						if (bucket && doc.r2Key) {
							try {
								await bucket.delete(doc.r2Key);
							} catch (r2Err) {
								console.warn(
									`[DeleteUser] Failed to delete R2 object ${doc.r2Key}:`,
									r2Err,
								);
							}
						}
						await db.delete(documents).where(eq(documents.id, doc.id));
					}

					// 4. Delete auth records (sessions, accounts, user row)
					await db.delete(session).where(eq(session.userId, userId));
					await db.delete(account).where(eq(account.userId, userId));
					await db.delete(user).where(eq(user.id, userId));

					const headers = new Headers({
						"Content-Type": "application/json",
					});
					// Clear both standard and __Secure cookies
					headers.append(
						"Set-Cookie",
						"better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
					);
					headers.append(
						"Set-Cookie",
						"__Secure-better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
					);

					return new Response(
						JSON.stringify({
							success: true,
							isAnonymous: isAnon,
							message: isAnon
								? "Anonymous session data cleared successfully."
								: "Account and personal data deleted successfully.",
						}),
						{
							status: 200,
							headers,
						},
					);
				} catch (error: any) {
					console.error("Error during data clearing/account deletion:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
