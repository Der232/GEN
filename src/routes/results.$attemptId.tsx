import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  Send,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import { useExamPerformanceStore } from '#/stores/useExamPerformanceStore'

export const Route = createFileRoute('/results/$attemptId')({ component: ResultsPage })

interface AttemptResult {
  id: string
  examId: string
  score: number
  totalQuestions: number
  correctCount: number
}

interface Question {
  id: string
  order: number
  type: string
  question: string
  options?: string[] | null
  correctAnswer: string
  explanation: string
}

interface Answer {
  questionId: string
  userAnswer: string
  isCorrect: boolean
}

interface QuestionRetryState {
  active: boolean
  selectedAnswer: string
  submitted: boolean
  isCorrect: boolean
}

function ResultsPage() {
  const { attemptId } = Route.useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<AttemptResult | null>(null)
  const [examTitle, setExamTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])

  // Zustand persistent performance store
  const recordAttemptCompletion = useExamPerformanceStore((state) => state.recordAttemptCompletion)
  const recordQuestionAnswer = useExamPerformanceStore((state) => state.recordQuestionAnswer)
  const questionPerformance = useExamPerformanceStore((state) => state.questionPerformance)

  // Filter state for reviewing questions
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'correct'>('all')

  // AI Explanation state per question: questionId -> string
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({})
  const [explainingLoading, setExplainingLoading] = useState<Record<string, boolean>>({})
  const [followUps, setFollowUps] = useState<Record<string, string>>({})

  // Interactive inline retry state per question
  const [retryStates, setRetryStates] = useState<Record<string, QuestionRetryState>>({})

  const toggleRetry = (questionId: string) => {
    setRetryStates((prev) => ({
      ...prev,
      [questionId]: {
        active: !prev[questionId]?.active,
        selectedAnswer: '',
        submitted: false,
        isCorrect: false,
      },
    }))
  }

  const handleSelectRetryAnswer = (questionId: string, answer: string) => {
    setRetryStates((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { active: true, submitted: false, isCorrect: false }),
        selectedAnswer: answer,
      },
    }))
  }

  const handleCheckRetryAnswer = (q: Question) => {
    const state = retryStates[q.id]
    if (!state || !state.selectedAnswer) return
    const isCorrect = state.selectedAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
    setRetryStates((prev) => ({
      ...prev,
      [q.id]: {
        ...state,
        submitted: true,
        isCorrect,
      },
    }))

    // Persist retry performance in Zustand store
    recordQuestionAnswer({
      questionId: q.id,
      examId: attempt?.examId,
      userAnswer: state.selectedAnswer,
      isCorrect,
    })
  }

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.attempt) setAttempt(data.attempt)
        if (data.exam) {
          setExamTitle(data.exam.title)
          setSubject(data.exam.subject)
        }
        if (data.questions) setQuestions(data.questions)
        if (data.answers) setAnswers(data.answers)

        // Persist attempt results and question answers in Zustand store
        if (data.attempt && data.answers && Array.isArray(data.answers)) {
          recordAttemptCompletion({
            attemptId,
            examId: data.attempt.examId,
            score: data.attempt.score,
            totalQuestions: data.attempt.totalQuestions,
            correctCount: data.attempt.correctCount,
            answers: data.answers.map((a: any) => ({
              questionId: a.questionId,
              userAnswer: a.userAnswer,
              isCorrect: a.isCorrect,
            })),
          })
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [attemptId, recordAttemptCompletion])

  const answersMap = answers.reduce<Record<string, Answer>>((acc, a) => {
    acc[a.questionId] = a
    return acc
  }, {})

  const wrongQuestions = questions.filter((q) => {
    const a = answersMap[q.id]
    return !a || !a.isCorrect
  })

  const correctQuestions = questions.filter((q) => {
    const a = answersMap[q.id]
    return a && a.isCorrect
  })

  const displayedQuestions = questions.filter((q) => {
    const a = answersMap[q.id]
    const isCorrect = a?.isCorrect ?? false
    if (filter === 'incorrect') return !isCorrect
    if (filter === 'correct') return isCorrect
    return true
  })

  const handleRequestExplanation = async (q: Question, customPrompt?: string) => {
    const a = answersMap[q.id]
    setExplainingLoading((prev) => ({ ...prev, [q.id]: true }))

    try {
      const res = await fetch('/api/exam/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: a?.userAnswer || '',
          explanation: q.explanation,
          followUp: customPrompt,
        }),
      })

      const data = await res.json()
      if (data.explanation) {
        setAiExplanations((prev) => ({ ...prev, [q.id]: data.explanation }))
      }
    } catch (err) {
      console.error('Explanation request failed:', err)
    } finally {
      setExplainingLoading((prev) => ({ ...prev, [q.id]: false }))
    }
  }

  const handleRetry = async () => {
    if (!attempt) return
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: attempt.examId }),
      })
      const data = await res.json()
      if (data.attemptId) {
        navigate({
          to: '/practice/$attemptId',
          params: { attemptId: data.attemptId },
        })
      }
    } catch (e) {
      alert('Failed to retry exam.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
        <p className="text-xs text-[var(--text-secondary)]">Compiling test results...</p>
      </div>
    )
  }

  const score = attempt?.score ?? 0
  const isPassing = score >= 70

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in space-y-6 sm:space-y-8">
      {/* ── Score Summary Card ── */}
      <div className="gen-card p-4 sm:p-8 text-center relative overflow-hidden">
        <div className="max-w-md mx-auto">
          <div
            className={`inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 ${
              isPassing ? 'badge-success' : 'badge-danger'
            }`}
          >
            <Award className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-neutral">
              {subject}
            </span>
            <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-none">{examTitle}</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">
            {score}%
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4 sm:mb-6">
            {isPassing
              ? 'Great mastery! You demonstrated strong comprehension of the core concepts.'
              : 'Keep practicing! Review the questions you missed below with the AI tutor.'}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 max-w-xs mx-auto">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-sm font-bold text-[var(--color-success)] flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{attempt?.correctCount || 0}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Correct</span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-sm font-bold text-[var(--color-danger)] flex items-center justify-center gap-1">
                <XCircle className="h-3.5 w-3.5" />
                <span>{wrongQuestions.length}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Incorrect</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleRetry}
              className="w-full sm:w-auto btn-primary px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry This Exam</span>
            </button>
            <Link
              to="/discover"
              className="w-full sm:w-auto btn-secondary px-4 sm:px-5 py-2.5 text-xs no-underline font-medium text-center"
            >
              Explore More Exams
            </Link>
          </div>
        </div>
      </div>

      {/* ── All Exam Questions Breakdown & Review ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Exam Review & Explanations ({questions.length})
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Review full answers, conceptual breakdowns, and ask the AI tutor for step-by-step proofs.
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                filter === 'all'
                  ? 'btn-primary font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              All ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('incorrect')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                filter === 'incorrect'
                  ? 'btn-primary font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Missed ({wrongQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                filter === 'correct'
                  ? 'btn-primary font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Correct ({attempt?.correctCount || 0})
            </button>
          </div>
        </div>

        {displayedQuestions.length === 0 ? (
          <div className="gen-card p-8 sm:p-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-success)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-muted)]">
              No questions in this filter view.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {displayedQuestions.map((q) => {
              const a = answersMap[q.id]
              const isCorrect = a?.isCorrect ?? false
              const explanation = aiExplanations[q.id]
              const isExplaining = explainingLoading[q.id]

              return (
                <div
                  key={q.id}
                  className={`gen-card p-4 sm:p-6 space-y-3.5 sm:space-y-4 border-l-4 ${
                    isCorrect
                      ? 'border-l-[var(--color-success)]'
                      : 'border-l-[var(--color-danger)]'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isCorrect
                            ? 'bg-[var(--color-success-subtle)] text-[var(--color-success)]'
                            : 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]'
                        }`}
                      >
                        {q.order}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isCorrect
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Incorrect Answer</span>
                          </>
                        )}
                      </span>
                      {questionPerformance[q.id] && questionPerformance[q.id].timesAttempted > 1 && (
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          • Attempted {questionPerformance[q.id].timesAttempted}x ({questionPerformance[q.id].timesCorrect} correct)
                        </span>
                      )}
                    </div>

                    {!isCorrect && (
                      <button
                        type="button"
                        onClick={() => toggleRetry(q.id)}
                        className="btn-secondary px-2.5 py-1 text-[11px] flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>{retryStates[q.id]?.active ? 'Close Practice' : 'Retry Question'}</span>
                      </button>
                    )}
                  </div>

                  {/* Interactive In-line Retry Drawer for Missed Questions */}
                  {!isCorrect && retryStates[q.id]?.active && (
                    <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Practice This Question</span>
                        </h4>
                        <span className="text-[10px] text-[var(--text-muted)]">Test your understanding now</span>
                      </div>

                      {/* Options if Multiple Choice */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid gap-2">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = retryStates[q.id]?.selectedAnswer === opt
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectRetryAnswer(q.id, opt)}
                                className={`w-full p-2.5 rounded-lg text-xs font-medium text-left border transition cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'btn-primary font-bold'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                <span>{opt}</span>
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* True / False */}
                      {q.type === 'true-false' && (
                        <div className="grid grid-cols-2 gap-2">
                          {['True', 'False'].map((val) => {
                            const isSelected = retryStates[q.id]?.selectedAnswer?.toLowerCase() === val.toLowerCase()
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSelectRetryAnswer(q.id, val)}
                                className={`py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                                  isSelected
                                    ? 'btn-primary font-bold'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {val}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Short Answer */}
                      {q.type === 'short-answer' && (
                        <input
                          type="text"
                          value={retryStates[q.id]?.selectedAnswer || ''}
                          onChange={(e) => handleSelectRetryAnswer(q.id, e.target.value)}
                          placeholder="Type your answer to test..."
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)]"
                        />
                      )}

                      {/* Action & Feedback */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={!retryStates[q.id]?.selectedAnswer}
                          onClick={() => handleCheckRetryAnswer(q)}
                          className="btn-primary py-1.5 px-4 text-xs font-semibold cursor-pointer disabled:opacity-40"
                        >
                          Check Answer
                        </button>

                        {retryStates[q.id]?.submitted && (
                          <div className="flex items-center gap-1.5">
                            {retryStates[q.id]?.isCorrect ? (
                              <span className="px-2.5 py-1 rounded-md badge-success text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Correct! Concept mastered.
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md badge-danger text-xs font-semibold flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" /> Still incorrect. Try again!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                    {q.question}
                  </h3>

                  {/* Answers Display */}
                  {isCorrect ? (
                    <div className="p-3.5 rounded-xl bg-[var(--color-success-subtle)] border border-[rgba(16,185,129,0.25)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)] block mb-0.5">
                          Your Answer (Correct):
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                          {a?.userAnswer || q.correctAnswer}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.25)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-danger)] block mb-1">
                          Your Answer:
                        </span>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {a?.userAnswer || 'Left Blank'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--color-success-subtle)] border border-[rgba(16,185,129,0.25)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)] block mb-1">
                          Correct Answer:
                        </span>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {q.correctAnswer}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Base Quick Explanation */}
                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">Key Concept: </span>
                      {q.explanation}
                    </div>
                  )}

                  {/* AI Tutor Deep-Dive Card */}
                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    {!explanation ? (
                      <button
                        onClick={() => handleRequestExplanation(q)}
                        disabled={isExplaining}
                        className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 cursor-pointer hover:border-[var(--border-strong)] text-[var(--text-primary)] font-semibold"
                      >
                        {isExplaining ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Tutor is analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>Explain Why & Show Step-by-Step with AI</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-4 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>AI Tutor Breakdown</span>
                        </div>

                        <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                          {explanation}
                        </div>

                        {/* Quick Prompt Suggestions */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() =>
                              handleRequestExplanation(q, 'Can you break down the mathematical/logical proof in simple terms?')
                            }
                            disabled={isExplaining}
                            className="px-2.5 py-1 rounded-lg text-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] text-[var(--text-secondary)] cursor-pointer transition"
                          >
                            Show Proof / Steps
                          </button>
                          <button
                            onClick={() =>
                              handleRequestExplanation(q, 'Give me a mnemonic or memory trick to never forget this.')
                            }
                            disabled={isExplaining}
                            className="px-2.5 py-1 rounded-lg text-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] text-[var(--text-secondary)] cursor-pointer transition"
                          >
                            Memory Trick
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
