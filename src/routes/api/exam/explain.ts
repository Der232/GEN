// @ts-expect-error
import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { executeAiCompletion } from "#/lib/ai";
import { auth } from "#/lib/auth";
import { checkExplanationLimit, recordExplanation } from "#/lib/rate-limiter";

export const Route = createFileRoute("/api/exam/explain")({
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

					const limitCheck = await checkExplanationLimit(session.user.id);
					if (!limitCheck.allowed) {
						return new Response(JSON.stringify({ error: limitCheck.error }), {
							status: 429,
							headers: { "Content-Type": "application/json" },
						});
					}

					const body = await request.json();
					const { question, correctAnswer, userAnswer, explanation, followUp } =
						body;

					if (!question || !correctAnswer) {
						return new Response(
							JSON.stringify({
								error: "Question and correct answer are required",
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const groqApiKey =
						process.env.GROQ_API_KEY || (env as any)?.GROQ_API_KEY;
					const groqBaseUrl =
						process.env.GROQ_BASE_URL ||
						(env as any)?.GROQ_BASE_URL ||
						"https://api.groq.com/openai/v1";

					if (!groqApiKey) {
						return new Response(
							JSON.stringify({ error: "AI provider not configured" }),
							{
								status: 500,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const systemPrompt = `You are a patient, brilliant, and encouraging personal tutor for students taking practice exams.
Your role: Explain clearly why the student's answer was mistaken and why the correct answer is the right one.
Break down any math, formulas, or logic step-by-step.
Be concise, clear, and direct. Use Markdown for formatting and code blocks if relevant.
Do NOT talk about unrelated topics. Focus 100% on helping the student understand this specific exam question.`;

					let userContent = `EXAM QUESTION:
${question}

STUDENT'S ANSWER:
${userAnswer || "No answer provided"}

CORRECT ANSWER:
${correctAnswer}

BASE EXPLANATION:
${explanation || "N/A"}`;

					if (followUp) {
						userContent += `\n\nSTUDENT'S FOLLOW-UP QUESTION:\n${followUp}`;
					}

					const completion = await executeAiCompletion({
						apiKey: groqApiKey,
						baseUrl: groqBaseUrl,
						messages: [
							{ role: "system", content: systemPrompt },
							{ role: "user", content: userContent },
						],
						jsonMode: false,
						temperature: 0.5,
						maxTokens: 1200,
						timeoutMs: 12000,
					});

					await recordExplanation(session.user.id);

					return new Response(
						JSON.stringify({
							explanation: completion.content,
							modelUsed: completion.modelUsed,
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
