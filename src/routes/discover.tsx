import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Compass, Search, Filter, Play, User, Loader2, Sparkles } from 'lucide-react'
import PracticeSetupModal from '#/components/PracticeSetupModal'

export const Route = createFileRoute('/discover')({ component: DiscoverPage })

interface PublicExam {
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

const SUBJECT_FILTERS = [
  'All',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'History',
  'Economics',
  'General Knowledge',
]

function DiscoverPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<PublicExam[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')
  const [selectedExamForPractice, setSelectedExamForPractice] = useState<PublicExam | null>(null)
  const [startingPractice, setStartingPractice] = useState(false)

  useEffect(() => {
    fetch('/api/exams?discover=true')
      .then((res) => (res.ok ? res.json() : { exams: [] }))
      .then((data) => {
        setExams(data.exams || [])
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredExams = exams.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(search.toLowerCase()) ||
      ex.subject.toLowerCase().includes(search.toLowerCase()) ||
      (ex.description && ex.description.toLowerCase().includes(search.toLowerCase()))

    const matchesSubject =
      selectedSubject === 'All' || ex.subject.toLowerCase() === selectedSubject.toLowerCase()

    const matchesDifficulty =
      selectedDifficulty === 'All' || ex.difficulty === selectedDifficulty

    return matchesSearch && matchesSubject && matchesDifficulty
  })

  const handleStartPractice = async (
    batch: 'all' | '5' | '1',
    mode: 'instant' | 'exam'
  ) => {
    if (!selectedExamForPractice) return
    setStartingPractice(true)

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExamForPractice.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start practice session.')

      setSelectedExamForPractice(null)
      navigate({
        to: '/practice/$attemptId',
        params: { attemptId: data.attemptId },
        search: {
          batch,
          mode,
        },
      })
    } catch (err: any) {
      alert(err.message || 'Failed to start practice session.')
    } finally {
      setStartingPractice(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Discover Public Exams
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Browse and practice exams created by students and educators across subjects.
          </p>
        </div>

        <Link to="/generate" className="btn-primary self-start text-xs no-underline px-4 py-2">
          <span>Create an Exam</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, keyword, or concept..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] transition"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-strong)]"
            >
              <option value="All">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {SUBJECT_FILTERS.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`
                px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs font-medium cursor-pointer border
                ${
                  selectedSubject === subj
                    ? 'btn-primary font-semibold'
                    : 'btn-secondary text-[var(--text-secondary)]'
                }
              `}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-3" />
          <p className="text-xs text-[var(--text-secondary)]">Loading community exams...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="gen-card p-12 text-center max-w-md mx-auto my-8">
          <Compass className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No exams found</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
            {search || selectedSubject !== 'All'
              ? 'Try adjusting your search filters to find what you are looking for.'
              : 'Be the first to generate and share a public exam on the platform!'}
          </p>
          <Link to="/generate" className="btn-primary text-xs inline-flex items-center gap-1.5 no-underline">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate First Exam</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExamForPractice(ex)}
              className="gen-card gen-card-hover p-5 flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-neutral">
                    {ex.subject}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      ex.difficulty === 'easy'
                        ? 'badge-success'
                        : ex.difficulty === 'medium'
                        ? 'badge-warning'
                        : 'badge-danger'
                    }`}
                  >
                    {ex.difficulty}
                  </span>
                </div>

                <h3 className="font-heading text-base font-bold text-[var(--text-primary)] mb-1.5 line-clamp-2 group-hover:underline">
                  {ex.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                  {ex.description || 'Comprehensive test questions covering core concepts and problem solving.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[110px]">{ex.authorDisplayName}</span>
                  <span>·</span>
                  <span>{ex.questionCount}Q</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedExamForPractice(ex)
                  }}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Practice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Practice Launch Setup Modal (Portaled to Body) */}
      <PracticeSetupModal
        open={!!selectedExamForPractice}
        onClose={() => setSelectedExamForPractice(null)}
        onStart={handleStartPractice}
        starting={startingPractice}
        examTitle={selectedExamForPractice?.title}
        totalQuestions={selectedExamForPractice?.questionCount}
      />
    </div>
  )
}
