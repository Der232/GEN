import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/db";
import { documents } from "#/db/schema";
import { auth } from "#/lib/auth";
import {
	MAX_FILE_SIZE_BYTES,
	type SupportedFileType,
} from "#/lib/document-processor";
import { checkUploadLimit } from "#/lib/rate-limiter";

export const Route = createFileRoute("/api/documents/initiate")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});
					if (!session?.user) {
						return new Response(
							JSON.stringify({
								error:
									"Authentication required. Please sign in or continue as guest.",
							}),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}

					// ─── Rate Limiting: Max 3 concurrent active uploads & max 15 per day ─────
					const limitCheck = await checkUploadLimit(session.user.id);
					if (!limitCheck.allowed) {
						return new Response(JSON.stringify({ error: limitCheck.error }), {
							status: 429,
							headers: { "Content-Type": "application/json" },
						});
					}

					const body = await request.json();
					const { filename, fileType, fileSize } = body as {
						filename: string;
						fileType: SupportedFileType;
						fileSize: number;
					};

					if (!filename || typeof filename !== "string") {
						return new Response(
							JSON.stringify({ error: "Filename is required." }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const validTypes: SupportedFileType[] = ["pdf", "pptx", "docx"];
					if (!validTypes.includes(fileType)) {
						return new Response(
							JSON.stringify({
								error: `Unsupported file type. Only PDF (.pdf), PowerPoint (.pptx), and Word (.docx) are supported.`,
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
						return new Response(
							JSON.stringify({ error: "Invalid file size." }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (fileSize > MAX_FILE_SIZE_BYTES) {
						return new Response(
							JSON.stringify({
								error: "File exceeds the maximum allowed size of 50 MB.",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const documentId = `doc_${crypto.randomUUID()}`;
					// Clean filename (strip directory separators)
					const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");
					const r2Key = `documents/${fileType}/${documentId}/${cleanFilename}`;

					await db.insert(documents).values({
						id: documentId,
						userId: session.user.id,
						filename: cleanFilename,
						fileType,
						fileSize,
						r2Key,
						status: "uploading",
					});

					return new Response(
						JSON.stringify({
							documentId,
							r2Key,
							uploadUrl: `/api/documents/${documentId}/upload`,
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (err: any) {
					console.error("Document initiate error:", err);
					return new Response(
						JSON.stringify({
							error: err.message || "Failed to initiate document upload.",
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
