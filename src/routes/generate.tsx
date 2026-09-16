import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Loader2,
  CheckCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Bookmark,
  Check,
} from 'lucide-react'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/generate')({ component: GeneratePage })

interface GeneratedQuestion {
  order: number
  type: 'multiple-choice' | 'true-false'
  question: string
  options?: string[] | null
  correctAnswer: string
  explanation: string
}

interface GeneratedExamResult {
  title: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  tags: string[]
  questions: GeneratedQuestion[]
}

const SUBJECT_OPTIONS = [
  'Auto-Detect (AI)',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'Chemistry',
  'History',
  'Economics',
  'Literature',
  'Medicine',
  'Engineering',
  'Philosophy',
  'Law',
  'Business',
  'Custom Subject / Category...',
]

function GeneratePage() {
  const navigate = useNavigate()

  // Form states
  const [topic, setTopic] = useState('')
  const [subjectOption, setSubjectOption] = useState('Auto-Detect (AI)')
  const [customSubject, setCustomSubject] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [countOption, setCountOption] = useState<'5' | '10' | '15' | 'custom'>('5')
  const [customCount, setCustomCount] = useState<number>(8)
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple-choice'])

  // Status states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedExamResult | null>(null)

  const toggleType = (t: string) => {
    if (questionTypes.includes(t)) {
      if (questionTypes.length === 1) return // maintain at least one
      setQuestionTypes(questionTypes.filter((x) => x !== t))
    } else {
      setQuestionTypes([...questionTypes, t])
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Please provide a topic or detailed concept description.')
      return
    }

    if (subjectOption === 'Custom Subject / Category...' && !customSubject.trim()) {
      setError('Please type your custom subject or select Auto-Detect.')
      return
    }

    if (questionTypes.length === 0) {
      setError('Please select at least one question format.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const effectiveSubject =
      subjectOption === 'Custom Subject / Category...'
        ? customSubject.trim()
        : subjectOption === 'Auto-Detect (AI)'
        ? 'Auto-Detect'
        : subjectOption

    const effectiveCount = countOption === 'custom' ? customCount : Number(countOption)

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subject: effectiveSubject,
          difficulty,
          questionCount: effectiveCount,
          questionTypes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate exam.')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndAction = async (action: 'practice' | 'list') => {
    if (!result) return
    setSaving(true)
    setError(null)

    try {
      // 1. Save exam to DB
      const saveRes = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam: {
            title: result.title,
            subject: result.subject,
            description: result.description,
            difficulty: result.difficulty,
            tags: result.tags,
          },
          questions: result.questions,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save exam.')

      // Invalidate and refresh database metrics in Zustand
      await useUserStore.getState().invalidateAndRefresh().catch(() => {})

      const examId = saveData.examId

      if (action === 'practice') {
        // 2. Start attempt and redirect to practice
        const attRes = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId }),
        })
        const attData = await attRes.json()
        if (!attRes.ok) throw new Error(attData.error || 'Failed to start attempt.')

        navigate({
          to: '/practice/$attemptId',
          params: { attemptId: attData.attemptId },
        })
      } else {
        navigate({ to: '/my-exams' })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save exam.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Generate New Exam
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Specify a topic, target difficulty, and question format. AI will build an exam with verified answer keys.
        </p>
      </div>

      {!result ? (
        /* ─── Generation Form ─── */
        <form onSubmit={handleGenerate} className="gen-card p-6 sm:p-8 space-y-6">
          {/* Topic Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Topic or Questions <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic, concept, or specific questions you want tested..."
              required
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border-strong)] transition resize-y min-h-[64px]"
            />
          </div>

          {/* Subject & Difficulty row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Field / Subject
              </label>
              <select
                value={subjectOption}
                onChange={(e) => setSubjectOption(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-strong)] transition"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub} className="bg-[var(--bg-surface)]">
                    {sub}
                  </option>
                ))}
              </select>

              {subjectOption === 'Custom Subject / Category...' ? (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Type custom subject (e.g. Cognitive Ergonomics, Tax Law)..."
                    required
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3.5 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] transition"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    AI will understand and tailor the questions to this custom subject context.
                  </p>
                </div>
              ) : subjectOption === 'Auto-Detect (AI)' ? (
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  AI will auto-detect the subject discipline directly from your topic details.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((lvl) => {
                  const selected = difficulty === lvl
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`
                        py-2 text-xs font-semibold rounded-lg capitalize transition-all border
                        ${
                          selected
                            ? lvl === 'easy'
                              ? 'badge-success border-emerald-500 font-bold'
                              : lvl === 'medium'
                              ? 'badge-warning border-amber-500 font-bold'
                              : 'badge-danger border-red-500 font-bold'
                            : 'btn-secondary text-[var(--text-secondary)]'
                        }
                      `}
                    >
                      {lvl}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Question Count */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Question Count
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                {countOption === 'custom' ? `${customCount} Questions` : `${countOption} Questions`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['5', '10', '15'] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCountOption(num)}
                  className={`
                    py-2 rounded-lg text-xs font-medium transition-all border
                    ${
                      countOption === num
                        ? 'btn-primary font-bold'
                        : 'btn-secondary text-[var(--text-secondary)]'
                    }
                  `}
                >
                  {num} Questions
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCountOption('custom')}
                className={`
                  py-2 rounded-lg text-xs font-medium transition-all border
                  ${
                    countOption === 'custom'
                      ? 'btn-primary font-bold'
                      : 'btn-secondary text-[var(--text-secondary)]'
                  }
                `}
              >
                Custom
              </button>
            </div>

            {countOption === 'custom' && (
              <div className="mt-2.5 flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)]">Custom question count (1 – 30):</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={customCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setCustomCount(Math.max(1, Math.min(30, val)))
                  }}
                  className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>
            )}
          </div>

          {/* Question Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Question Formats
              </label>
              {questionTypes.length > 1 && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Random mixed distribution
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'multiple-choice', label: 'Multiple Choice' },
                { id: 'true-false', label: 'True / False' },
              ].map((t) => {
                const checked = questionTypes.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`
                      px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border cursor-pointer
                      ${
                        checked
                          ? 'bg-[var(--bg-surface-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] font-semibold'
                          : 'btn-secondary text-[var(--text-secondary)]'
                      }
                    `}
                  >
                    <div
                      className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                        checked ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]' : 'border-[var(--border-strong)]'
                      }`}
                    >
                      {checked && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
            {questionTypes.length > 1 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                Both formats selected: questions will be a randomized mix of Multiple Choice and True/False.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.25)] text-xs text-[var(--color-danger)] flex items-center gap-2">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Synthesizing Exam with AI...</span>
              </>
            ) : (
              <span>Generate Exam</span>
            )}
          </button>
        </form>
      ) : (
        /* ─── Generated Exam Preview ─── */
        <div className="space-y-6">
          <div className="gen-card p-6 border-l-4 border-l-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-neutral">
                  {result.subject}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                    result.difficulty === 'easy'
                      ? 'badge-success'
                      : result.difficulty === 'medium'
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                >
                  {result.difficulty}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {result.questions.length} questions
                </span>
              </div>
              <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
                {result.title}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                {result.description}
              </p>
            </div>

            {/* Quick CTA Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setResult(null)}
                disabled={saving}
                className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                title="Discard and generate another"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => handleSaveAndAction('list')}
                disabled={saving}
                className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save to Library</span>
              </button>
              <button
                onClick={() => handleSaveAndAction('practice')}
                disabled={saving}
                className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Save & Practice</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.25)] text-xs text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {/* Questions Accordion / List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
              Generated Questions Preview
            </h3>

            {result.questions.map((q, idx) => (
              <div key={idx} className="gen-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[10px] font-bold flex items-center justify-center text-[var(--text-secondary)]">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {q.type.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {q.question}
                </p>

                {/* Options if Multiple Choice */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = opt === q.correctAnswer
                      return (
                        <div
                          key={oIdx}
                          className={`
                            px-3 py-2 rounded-lg text-xs flex items-center justify-between border
                            ${
                              isCorrect
                                ? 'bg-[var(--color-success-subtle)] border-emerald-500/40 text-[var(--color-success)] font-semibold'
                                : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }
                          `}
                        >
                          <span>{opt}</span>
                          {isCorrect && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Short answer correct key */}
                {!q.options && (
                  <div className="px-3 py-2 rounded-lg bg-[var(--color-success-subtle)] border border-emerald-500/40 text-xs text-[var(--color-success)] font-medium">
                    Answer Key: {q.correctAnswer}
                  </div>
                )}

                {/* Explanation */}
                <div className="p-3 rounded-lg bg-[var(--bg-surface-elevated)] text-[11px] text-[var(--text-secondary)] leading-relaxed border border-[var(--border-subtle)]">
                  <span className="font-semibold text-[var(--text-primary)]">Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
