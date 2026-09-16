import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BookOpen, Play, Trash2, Loader2, Calendar } from 'lucide-react'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/my-exams')({ component: MyExamsPage })

interface UserExam {
  id: string
  title: string
  subject: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  createdAt: string
}

function MyExamsPage() {
  const [exams, setExams] = useState<UserExam[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchMyExams = () => {
    fetch('/api/exams')
      .then((res) => (res.ok ? res.json() : { exams: [] }))
      .then((data) => setExams(data.exams || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMyExams()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this exam?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setExams((prev) => prev.filter((x) => x.id !== id))
        await useUserStore.getState().invalidateAndRefresh().catch(() => {})
      }
    } catch (err) {
      alert('Failed to delete exam.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            My Generated Exams
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Access, practice, and manage all exams generated in your workspace.
          </p>
        </div>

        <Link
          to="/generate"
          className="btn-primary text-xs self-start no-underline font-semibold px-4 py-2"
        >
          <span>New Exam</span>
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-primary)] mb-2" />
          <p className="text-xs text-[var(--text-secondary)]">Retrieving your exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="gen-card p-12 text-center max-w-md mx-auto">
          <BookOpen className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No exams generated yet</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-5">
            Create your first test on any academic topic in seconds.
          </p>
          <Link to="/generate" className="btn-primary text-xs inline-flex items-center no-underline px-4 py-2">
            <span>Generate Exam</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((ex) => (
            <div
              key={ex.id}
              className="gen-card gen-card-hover p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
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

                <h3 className="font-heading text-base font-bold text-[var(--text-primary)] mb-1.5 line-clamp-2">
                  {ex.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                  {ex.description || 'Custom generated practice questions and explanations.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  {ex.questionCount} Questions
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(ex.id, e)}
                    disabled={deletingId === ex.id}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
                    title="Delete Exam"
                  >
                    {deletingId === ex.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>

                  <Link
                    to="/exam/$examId"
                    params={{ examId: ex.id }}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 no-underline font-semibold"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Practice</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
