import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore
import { env } from 'cloudflare:workers'

export const Route = createFileRoute('/api/exam/explain')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { question, correctAnswer, userAnswer, explanation, followUp } = body

          if (!question || !correctAnswer) {
            return new Response(JSON.stringify({ error: 'Question and correct answer are required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const groqApiKey = process.env.GROQ_API_KEY || (env as any)?.GROQ_API_KEY
          const groqBaseUrl = process.env.GROQ_BASE_URL || (env as any)?.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'

          if (!groqApiKey) {
            return new Response(JSON.stringify({ error: 'AI provider not configured' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const systemPrompt = `You are a patient, brilliant, and encouraging personal tutor for students taking practice exams.
Your role: Explain clearly why the student's answer was mistaken and why the correct answer is the right one.
Break down any math, formulas, or logic step-by-step.
Be concise, clear, and direct. Use Markdown for formatting and code blocks if relevant.
Do NOT talk about unrelated topics. Focus 100% on helping the student understand this specific exam question.`

          let userContent = `EXAM QUESTION:
${question}

STUDENT'S ANSWER:
${userAnswer || 'No answer provided'}

CORRECT ANSWER:
${correctAnswer}

BASE EXPLANATION:
${explanation || 'N/A'}`

          if (followUp) {
            userContent += `\n\nSTUDENT'S FOLLOW-UP QUESTION:\n${followUp}`
          }

          const groqResponse = await fetch(`${groqBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.8-27b',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.5,
              max_tokens: 800,
            }),
          })

          if (!groqResponse.ok) {
            const err = await groqResponse.text()
            console.error('Groq explanation error:', err)
            return new Response(JSON.stringify({ error: 'Explanation failed' }), {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const data: any = await groqResponse.json()
          const explanationText = data.choices?.[0]?.message?.content || 'No explanation available.'

          return new Response(JSON.stringify({ explanation: explanationText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
