import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db'
import { exams, questions, type Question } from '#/db/schema'
import { eq, asc } from 'drizzle-orm'

export const Route = createFileRoute('/api/exams/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params

          const exam = await db.query.exams.findFirst({
            where: eq(exams.id, id),
          })

          if (!exam) {
            return new Response(JSON.stringify({ error: 'Exam not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const qList = await db.query.questions.findMany({
            where: eq(questions.examId, id),
            orderBy: [asc(questions.order)],
          })

          const formattedQuestions = qList.map((q: Question) => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null,
          }))

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
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },

      DELETE: async ({ params }) => {
        try {
          const { id } = params
          await db.delete(questions).where(eq(questions.examId, id))
          await db.delete(exams).where(eq(exams.id, id))

          return new Response(JSON.stringify({ success: true }), {
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
