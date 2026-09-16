import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  BookOpen,
  Play,
  User,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react'
import { useExamPerformanceStore } from '#/stores/useExamPerformanceStore'

export const Route = createFileRoute('/exam/$examId')({ component: ExamDetailPage })

interface ExamDetail {
  id: string
  title: string
  subject: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  authorDisplayName: string
  createdAt: string
  tags?: string[]
}

interface QuestionOutline {
  id: string
  order: number
  type: string
  question: string
}

function ExamDetailPage() {
  const { examId } = Route.useParams()
  const navigate = useNavigate()

  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [questions, setQuestions] = useState<QuestionOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [batchSize, setBatchSize] = useState<number>(1) // 1, 5, 10, or all
  const [mounted, setMounted] = useState(false)

  const examHistory = useExamPerformanceStore((state) => state.examHistory[examId])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch(`/api/exams/${examId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exam) {
          setExam(data.exam)
          setQuestions(data.questions || [])
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [examId])

  const handleStart = async () => {
    if (!exam) return
    setStarting(true)

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start practice')

      navigate({
        to: '/practice/$attemptId',
        params: { attemptId: data.attemptId },
        search: { batch: batchSize },
      })
    } catch (err: any) {
      alert(err.message || 'Error starting exam attempt')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
        <p className="text-xs text-[var(--text-secondary)]">Loading exam details...</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Exam Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-6">
          This exam may have been deleted or the link is invalid.
        </p>
        <Link to="/discover" className="btn-secondary text-xs no-underline inline-flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Discover
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in space-y-8">
      {/* Back button */}
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Discover</span>
      </Link>

      {/* Main Header Card */}
      <div className="gen-card p-6 sm:p-8 space-y-5 border-t-4 border-t-[var(--border-strong)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold badge-neutral">
            {exam.subject}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold capitalize ${
              exam.difficulty === 'easy'
                ? 'badge-success'
                : exam.difficulty === 'medium'
                ? 'badge-warning'
                : 'badge-danger'
            }`}
          >
            {exam.difficulty}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {exam.questionCount} Questions
          </span>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight">
          {exam.title}
        </h1>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {exam.description || 'Test your understanding with comprehensive evaluation questions and instant AI explanations.'}
        </p>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <User className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <span className="truncate">{exam.authorDisplayName}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Layers className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <span>Standard Evaluation</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <span>Public Archive</span>
          </div>
          {mounted && examHistory && examHistory.totalAttempts > 0 && (
            <div className="flex items-center gap-2 text-[var(--color-warning)] col-span-2 sm:col-span-3 font-medium">
              <Award className="h-4 w-4 shrink-0" />
              <span>
                Personal Best: {examHistory.bestScore}% ({examHistory.totalAttempts} previous {examHistory.totalAttempts === 1 ? 'attempt' : 'attempts'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Practice Configuration */}
      <div className="gen-card p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Practice Mode Settings
        </h2>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Question Batching:
            </label>
            <span className="text-[11px] text-[var(--text-muted)]">
              Exam has {exam.questionCount} questions
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: '1 at a time', val: 1 },
              { label: '5 at a time', val: 5 },
              { label: '10 at a time', val: 10 },
              { label: 'All at once', val: exam.questionCount },
            ].map((option) => {
              const exceeds = option.val > exam.questionCount && option.val !== exam.questionCount
              const isSelected = batchSize === option.val
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setBatchSize(option.val)}
                  className={`
                    py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border
                    ${
                      isSelected
                        ? exceeds
                          ? 'border-[var(--color-danger)] bg-[var(--color-danger-subtle)] text-[var(--color-danger)] font-bold ring-1 ring-[var(--color-danger)]'
                          : 'btn-primary font-bold'
                        : exceeds
                        ? 'border-[rgba(239,68,68,0.35)] text-[var(--color-danger)]/80 bg-[var(--bg-surface-elevated)]'
                        : 'btn-secondary text-[var(--text-secondary)]'
                    }
                  `}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {/* Validation Warning when selected batch exceeds total questions */}
          {batchSize > exam.questionCount && (
            <div className="mt-3 p-3 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.35)] text-xs text-[var(--color-danger)] flex items-center gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Selected choice ({batchSize} at a time) exceeds total questions in this exam ({exam.questionCount}Q). Please choose a smaller batch size to proceed.
              </span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={handleStart}
            disabled={starting || batchSize > exam.questionCount}
            className={`w-full py-3.5 text-sm flex items-center justify-center gap-2 font-semibold shadow-md transition-all ${
              batchSize > exam.questionCount
                ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-50'
                : 'btn-primary cursor-pointer disabled:opacity-50'
            }`}
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Preparing test session...</span>
              </>
            ) : batchSize > exam.questionCount ? (
              <span>Exceeds Question Count — Select Smaller Batch</span>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Practice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Questions Included Card */}
      <div className="gen-card p-6 space-y-3.5 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Questions Included ({questions.length})
          </h3>
          <span className="text-[11px] text-[var(--text-muted)]">
            Answers hidden until submission
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] max-h-[380px] overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div key={q.id} className="py-2.5 flex items-center gap-3 min-w-0">
              <span className="h-5 w-5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p className="text-xs text-[var(--text-primary)] truncate min-w-0 flex-1">
                {q.question}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded badge-neutral shrink-0">
                {q.type === 'multiple-choice' ? 'Multiple Choice' : 'True / False'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
