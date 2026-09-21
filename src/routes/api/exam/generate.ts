// @ts-expect-error
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { documents } from "#/db/schema";
import { executeAiCompletion } from "#/lib/ai";
import { auth } from "#/lib/auth";
import { checkGenerationLimit, recordGeneration } from "#/lib/rate-limiter";

const GeneratedQuestionSchema = z.object({
	order: z.number(),
	type: z.enum(["multiple-choice", "true-false"]),
	question: z.string(),
	options: z.array(z.string()),
	correctAnswer: z.string(),
	explanation: z.string(),
});

const GeneratedExamSchema = z.object({
	title: z.string(),
	subject: z.string(),
	difficulty: z.enum(["easy", "medium", "hard"]),
	description: z.string(),
	tags: z.array(z.string()),
	questions: z.array(GeneratedQuestionSchema),
	documentId: z.string().optional().nullable(),
});

export type GeneratedExam = z.infer<typeof GeneratedExamSchema>;

export const Route = createFileRoute("/api/exam/generate")({
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

					// ─── Rate Limiting: 30s cooldown & daily quotas (10 guest / 25 user) ───
					const clientIp =
						request.headers.get("cf-connecting-ip") ||
						request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
						null;
					const isAnonymous = Boolean(
						(session.user as any)?.isAnonymous || !session.user.email,
					);

					const limitCheck = await checkGenerationLimit({
						userId: session.user.id,
						isAnonymous,
						clientIp,
					});

					if (!limitCheck.allowed) {
						return new Response(
							JSON.stringify({
								error: limitCheck.error,
								retryAfterSeconds: limitCheck.retryAfterSeconds,
							}),
							{
								status: 429,
								headers: {
									"Content-Type": "application/json",
									...(limitCheck.retryAfterSeconds
										? { "Retry-After": String(limitCheck.retryAfterSeconds) }
										: {}),
								},
							},
						);
					}

					const body = await request.json();
					const {
						topic,
						subject,
						difficulty = "medium",
						questionCount = 5,
						questionTypes = ["multiple-choice"],
						documentId,
					} = body;

					let docRecord: any = null;
					if (documentId) {
						docRecord = await db.query.documents.findFirst({
							where: eq(documents.id, documentId),
						});
						if (!docRecord) {
							return new Response(
								JSON.stringify({ error: "Uploaded document not found." }),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
						if (docRecord.userId !== session.user.id) {
							return new Response(
								JSON.stringify({
									error: "Unauthorized access to this document.",
								}),
								{
									status: 403,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
						if (docRecord.status !== "ready" || !docRecord.extractedText) {
							return new Response(
								JSON.stringify({
									error:
										docRecord.status === "failed"
											? `Document extraction failed: ${docRecord.errorMessage || "Unable to extract text"}`
											: "Document is still being prepared. Please wait a moment and try again.",
								}),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					}

					if (
						!docRecord &&
						(!topic || typeof topic !== "string" || topic.trim().length === 0)
					) {
						return new Response(
							JSON.stringify({
								error: "Please provide a topic or upload a document.",
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (Number(questionCount) > 30) {
						return new Response(
							JSON.stringify({ error: "Question count cannot exceed 30." }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const count = Math.min(Math.max(Number(questionCount) || 5, 1), 30);

					// Sanitize permitted question types (only multiple-choice and true-false)
					const validTypes = ["multiple-choice", "true-false"] as const;
					const filteredTypes = Array.isArray(questionTypes)
						? questionTypes.filter((t: string) => validTypes.includes(t as any))
						: ["multiple-choice"];
					const activeTypes =
						filteredTypes.length > 0 ? filteredTypes : ["multiple-choice"];
					const typesDesc = activeTypes.join(", ");

					const isAutoDetect =
						!subject || subject.trim() === "" || subject === "Auto-Detect";
					const cleanSubject = isAutoDetect ? "" : subject.trim();

					const sourceContent = docRecord
						? (docRecord.extractedText || "").slice(0, 35000)
						: null;

					const systemPrompt = `You are an expert academic test developer and curriculum designer.
Generate an exam based on the user's ${docRecord ? "provided source document and focus instructions" : "topic or questions"} in strict JSON format.

CRITICAL JSON SCHEMA REQUIREMENT:
Your response must be a single valid JSON object with EXACTLY this structure:
{
  "title": "A concise, engaging title for the exam",
  "subject": ${isAutoDetect ? '"Auto-detected subject name based on topic"' : `"${cleanSubject}"`},
  "difficulty": "${difficulty}",
  "description": "A 1-2 sentence overview of what this exam tests",
  "tags": ["tag1", "tag2"],
  "questions": [
    {
      "order": 1,
      "type": "multiple-choice", // or "true-false"
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // or ["True", "False"] if true-false
      "correctAnswer": "The exact matching text of the correct option",
      "explanation": "Clear, step-by-step reasoning explaining why this answer is correct"
    }
  ]
}

RULES:
1. QUESTION COUNT: You MUST generate EXACTLY ${count} questions. The "questions" array MUST contain exactly ${count} items with order: 1, 2, ..., ${count}. You MUST NOT stop early or generate fewer questions under any circumstances.
2. QUESTION FORMATS: Permitted formats are: [${typesDesc}]. ONLY use types from this permitted list.
${
	activeTypes.length > 1
		? `3. RANDOM MIX OF FORMATS: The user selected both formats (${typesDesc}). You MUST generate a random, well-distributed mix of multiple-choice and true-false questions across the ${count} questions. Do NOT make all questions of one type. Interleave them in random sequence throughout the exam.`
		: `3. SINGLE FORMAT: All ${count} questions must be of type "${activeTypes[0]}".`
}
4. FORMAT SPECIFICATIONS:
   - For "multiple-choice": "options" MUST be an array of exactly 4 distinct, plausible options. "correctAnswer" MUST match one option verbatim.
   - For "true-false": "options" MUST be exactly ["True", "False"]. "correctAnswer" MUST be either "True" or "False".
5. SUBJECT SPECIFICATION:
${
	isAutoDetect
		? `   - Deduced academic discipline: You MUST carefully analyze the material and automatically deduce the most fitting academic subject or discipline (e.g., "Computer Science", "Biochemistry", "Microeconomics", "Discrete Mathematics", "World History"). Set the "subject" field in the JSON response to your accurately detected subject name.`
		: `   - Explicit discipline: The user specified "${cleanSubject}". Contextualize all questions and terminology within this subject.`
}
6. DIFFICULTY: The difficulty is "${difficulty}". Ensure the problem depth, vocabulary, and conceptual challenge accurately match this level.
7. EXPLANATION CONCISENESS: Keep each "explanation" concise (1 to 2 clear sentences) stating directly why the correct answer is right and why the key distractor is mistaken. Deep, conversational explanations are provided interactively via the tutor on-demand.
${
	docRecord
		? `8. SOURCE MATERIAL FIDELITY: All questions, answers, and explanations MUST be strictly derived from and faithful to the provided SOURCE MATERIAL. Do NOT make up facts not mentioned in the source material.
${topic?.trim() ? `9. FOCUS INSTRUCTION: The user provided this focus instruction: "${topic.trim()}". Weight questions more heavily towards these requested concepts while staying completely faithful to the source material.` : ""}`
		: ""
}
10. Return ONLY pure JSON. No markdown backticks, no introduction, no conversational filler.`;

					const userPrompt = docRecord
						? `SOURCE MATERIAL (Extracted from uploaded file: ${docRecord.filename}):
"""
${sourceContent}
"""

${
	topic?.trim()
		? `USER FOCUS & PREFERENCE INSTRUCTION:
"""
${topic.trim()}
"""`
		: "Please generate a comprehensive exam covering the key concepts in this source material."
}

TARGET SPECIFICATIONS:
- Target Subject / Category: ${isAutoDetect ? "Auto-Detect from document" : cleanSubject}
- Target Difficulty: ${difficulty}
- Total Questions: ${count}
- Allowed Question Formats: ${typesDesc}

Please generate the complete exam in the required JSON format.`
						: `DETAILED TOPIC / CONCEPT SPECIFICATION FROM USER:
"""
${(topic || "").trim()}
"""

TARGET SPECIFICATIONS:
- Target Subject / Category: ${isAutoDetect ? "Auto-Detect from topic" : cleanSubject}
- Target Difficulty: ${difficulty}
- Total Questions: ${count}
- Allowed Question Formats: ${typesDesc}

Please generate the complete exam in the required JSON format.`;

					const groqApiKey =
						process.env.GROQ_API_KEY || (env as any)?.GROQ_API_KEY;
					const groqBaseUrl =
						process.env.GROQ_BASE_URL ||
						(env as any)?.GROQ_BASE_URL ||
						"https://api.groq.com/openai/v1";

					if (!groqApiKey) {
						return new Response(
							JSON.stringify({
								error: "GROQ_API_KEY is not configured on the server.",
							}),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}

					const completion = await executeAiCompletion({
						apiKey: groqApiKey,
						baseUrl: groqBaseUrl,
						messages: [
							{ role: "system", content: systemPrompt },
							{ role: "user", content: userPrompt },
						],
						jsonMode: true,
						temperature: 0.5,
						maxTokens: 8192,
						timeoutMs: 20000,
					});

					const parsed = JSON.parse(completion.content);
					if (docRecord?.id) {
						parsed.documentId = docRecord.id;
					}
					const validated = GeneratedExamSchema.parse(parsed);
					console.log(
						`[ExamGen] Successfully generated ${validated.questions.length} questions using ${completion.modelUsed}`,
					);

					// Record generation event for cooldown and daily quota tracking
					await recordGeneration({
						userId: session.user.id,
						isAnonymous,
						clientIp,
					});

					return new Response(JSON.stringify(validated), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error: any) {
					console.error("Exam generation error:", error);
					return new Response(
						JSON.stringify({
							error:
								error.message || "An error occurred while generating the exam.",
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
