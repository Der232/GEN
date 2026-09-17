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
import PracticeSetupModal from '#/components/PracticeSetupModal'

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
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
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

  const handleStartPractice = async (
    batch: 'all' | '5' | '1',
    mode: 'instant' | 'exam'
  ) => {
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

      setIsPracticeModalOpen(false)
      navigate({
        to: '/practice/$attemptId',
        params: { attemptId: data.attemptId },
        search: {
          batch,
          mode,
        },
      })
    } catch (err: any) {
      alert(err.message || 'Error starting exam attempt')
    } finally {
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in space-y-6 sm:space-y-8">
      {/* Back button */}
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Discover</span>
      </Link>

      {/* Main Header Card */}
      <div className="gen-card p-4 sm:p-8 space-y-4 sm:space-y-5 border-t-4 border-t-[var(--border-strong)]">
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

        <h1 className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight">
          {exam.title}
        </h1>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {exam.description || 'Test your understanding with comprehensive evaluation questions and instant AI explanations.'}
        </p>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
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

      {/* Practice Launch Card */}
      <div className="gen-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-l-4 border-l-[var(--border-strong)]">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
            Ready to test your knowledge?
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure your batch size and feedback preference to start.
          </p>
        </div>

        <button
          onClick={() => setIsPracticeModalOpen(true)}
          className="w-full sm:w-auto btn-primary py-2.5 px-5 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-md shrink-0"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Launch Practice Session</span>
        </button>
      </div>

      {/* Questions Included Card */}
      <div className="gen-card p-4 sm:p-6 space-y-3.5 w-full min-w-0 overflow-hidden">
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

      {/* Unified Practice Launch Setup Modal (Portaled to Body) */}
      <PracticeSetupModal
        open={isPracticeModalOpen}
        onClose={() => setIsPracticeModalOpen(false)}
        onStart={handleStartPractice}
        starting={starting}
        examTitle={exam.title}
        totalQuestions={exam.questionCount}
      />
    </div>
  )
}
