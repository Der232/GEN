import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  CheckCircle,
  ArrowRight,
  Loader2,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react'
import { useExamSessionStore } from '#/stores/useExamSessionStore'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/practice/$attemptId')({
  component: PracticePage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      batch: Number(search?.batch) || 1,
    }
  },
})

interface Question {
  id: string
  order: number
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  question: string
  options?: string[] | null
  correctAnswer: string
}

interface AttemptAnswer {
  questionId: string
  userAnswer: string
  isCorrect: boolean
}

function PracticePage() {
  const { attemptId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const batchSize = Math.max(Number(search.batch) || 1, 1)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  // Zustand persistent session store
  const userAnswers = useExamSessionStore((state) => state.userAnswers)
  const currentBatchIndex = useExamSessionStore((state) => state.currentBatchIndex)
  const setAnswer = useExamSessionStore((state) => state.setAnswer)
  const setBatchIndex = useExamSessionStore((state) => state.setBatchIndex)
  const initSession = useExamSessionStore((state) => state.initSession)
  const clearSession = useExamSessionStore((state) => state.clearSession)

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.attempt?.status === 'completed') {
          // Already completed, redirect to results
          navigate({ to: '/results/$attemptId', params: { attemptId } })
          return
        }

        if (data.exam) {
          setExamTitle(data.exam.title)
          setSubject(data.exam.subject)
        }

        if (data.questions) {
          setQuestions(data.questions)
        }

        // Restore previously saved answers from backend and merge into Zustand store
        const serverAnswers: Record<string, string> = {}
        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach((a: AttemptAnswer) => {
            serverAnswers[a.questionId] = a.userAnswer
          })
        }

        initSession({
          attemptId,
          examId: data.exam?.id || '',
          batchSize,
          initialAnswers: serverAnswers,
        })
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [attemptId, batchSize, initSession, navigate])

  const currentQuestions = questions.slice(
    currentBatchIndex * batchSize,
    (currentBatchIndex + 1) * batchSize,
  )

  const totalBatches = Math.ceil(questions.length / batchSize)
  const isLastBatch = currentBatchIndex >= totalBatches - 1

  const handleSelectAnswer = async (questionId: string, answer: string) => {
    // 1. Update Zustand store immediately (persists to localStorage)
    setAnswer(questionId, answer)

    // 2. Persist answer to backend in background
    try {
      await fetch(`/api/attempts/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          questionId,
          userAnswer: answer,
        }),
      })
    } catch (err) {
      console.error('Failed to sync answer:', err)
    }
  }

  const handleAdvance = async () => {
    if (isLastBatch) {
      // Submit final exam!
      setSubmitting(true)
      try {
        const res = await fetch(`/api/attempts/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to submit')

        // Clear in-progress session upon successful submission
        clearSession()

        // Invalidate and refresh database performance metrics in Zustand
        await useUserStore.getState().invalidateAndRefresh().catch(() => {})

        navigate({
          to: '/results/$attemptId',
          params: { attemptId },
        })
      } catch (err: any) {
        alert(err.message || 'Error submitting exam')
        setSubmitting(false)
      }
    } else {
      // Advance to next batch (persists in Zustand)
      setBatchIndex(currentBatchIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Check if all questions in the current batch have been answered
  const allCurrentAnswered = currentQuestions.every(
    (q) => userAnswers[q.id] && userAnswers[q.id].trim().length > 0,
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
        <p className="text-xs text-[var(--text-secondary)]">Loading practice session...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in space-y-6">
      {/* Top Bar: Progress and Metadata */}
      <div className="gen-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-neutral">
              {subject}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Batch {currentBatchIndex + 1} of {totalBatches}
            </span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate max-w-lg">
            {examTitle}
          </h1>
        </div>

        {/* Progress indicator */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">
            Progress: {Math.min((currentBatchIndex + 1) * batchSize, questions.length)} / {questions.length} Questions
          </div>
          <div className="w-full sm:w-36 h-2 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-300"
              style={{
                width: `${Math.round(
                  (((currentBatchIndex + 1) * batchSize) / questions.length) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Notice on exam rules */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning)] shrink-0" />
        <span>You cannot revisit previous questions once you advance. Results & AI explanations appear at the end.</span>
      </div>

      {/* Current Questions List */}
      <div className="space-y-5">
        {currentQuestions.map((q, idx) => {
          const globalNumber = currentBatchIndex * batchSize + idx + 1
          const selectedAnswer = userAnswers[q.id] || ''

          return (
            <div key={q.id} className="gen-card p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-[var(--border-strong)]">
                  {globalNumber}
                </span>
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    {q.type.replace('-', ' ')}
                  </span>
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                    {q.question}
                  </h2>
                </div>
              </div>

              {/* Multiple Choice Options */}
              {q.type === 'multiple-choice' && q.options && (
                <div className="grid gap-2.5 pt-2 pl-9">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswer === opt
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={`
                          w-full p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between text-left transition-all cursor-pointer
                          ${
                            isSelected
                              ? 'bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] text-[var(--text-primary)] font-semibold shadow-sm ring-1 ring-[var(--border-strong)]'
                              : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }
                        `}
                      >
                        <span className="pr-3">{opt}</span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]'
                              : 'border-[var(--border-strong)]'
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* True / False Options */}
              {q.type === 'true-false' && (
                <div className="grid grid-cols-2 gap-3 pt-2 pl-9">
                  {['True', 'False'].map((val) => {
                    const isSelected = selectedAnswer.toLowerCase() === val.toLowerCase()
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectAnswer(q.id, val)}
                        className={`
                          py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center border
                          ${
                            isSelected
                              ? 'bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] text-[var(--text-primary)] ring-1 ring-[var(--border-strong)] font-bold'
                              : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }
                        `}
                      >
                        {val}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Short Answer Input */}
              {q.type === 'short-answer' && (
                <div className="pt-2 pl-9">
                  <textarea
                    rows={2}
                    value={selectedAnswer}
                    onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                    placeholder="Type your concise conceptual answer..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] transition resize-none"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--text-muted)]">
          {!allCurrentAnswered && (
            <span className="text-[var(--color-warning)] font-medium">
              Please answer all questions before advancing.
            </span>
          )}
        </p>

        <button
          onClick={handleAdvance}
          disabled={!allCurrentAnswered || submitting}
          className="btn-primary py-3 px-6 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 ml-auto shadow-md"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scoring Exam...</span>
            </>
          ) : isLastBatch ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Submit Exam & View Results</span>
            </>
          ) : (
            <>
              <span>Next Questions</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
