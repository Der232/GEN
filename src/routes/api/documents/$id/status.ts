import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { documents } from "#/db/schema";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/documents/$id/status")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				try {
					const { id } = params;
					const session = await auth.api.getSession({
						headers: request.headers,
					});
					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized." }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const doc = await db.query.documents.findFirst({
						where: and(
							eq(documents.id, id),
							eq(documents.userId, session.user.id),
						),
					});

					if (!doc) {
						return new Response(
							JSON.stringify({ error: "Document not found." }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					return new Response(
						JSON.stringify({
							id: doc.id,
							filename: doc.filename,
							fileType: doc.fileType,
							fileSize: doc.fileSize,
							status: doc.status,
							errorMessage: doc.errorMessage,
							updatedAt: doc.updatedAt,
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (err: any) {
					console.error("Document status error:", err);
					return new Response(
						JSON.stringify({ error: err.message || "Failed to check status." }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
