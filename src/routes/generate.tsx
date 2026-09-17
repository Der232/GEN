import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import {
  Loader2,
  CheckCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Bookmark,
  Check,
  Plus,
  FileText,
  Presentation,
  FileCode,
  X,
  RefreshCw,
  EyeOff,
  Sliders,
  Edit3,
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
  documentId?: string | null
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
  const [countOption, setCountOption] = useState<'5' | '10' | '15' | '20' | '25' | '30' | 'custom'>('5')
  const [customCount, setCustomCount] = useState<number>(8)
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple-choice'])

  // File upload states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle')
  const [docProcessingStatus, setDocProcessingStatus] = useState<'idle' | 'processing' | 'ready' | 'failed'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0) // 0 to 100
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState<string>('')
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [isSlow, setIsSlow] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // Status states
  const [loading, setLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedExamResult | null>(null)
  const [savedExamId, setSavedExamId] = useState<string | null>(null)

  // Practice launch modal states
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
  const [practiceBatch, setPracticeBatch] = useState<'all' | '5' | '1'>('all')
  const [practiceMode, setPracticeMode] = useState<'instant' | 'exam'>('instant')

  const getFileType = (name: string): 'pdf' | 'pptx' | 'docx' | null => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'pptx') return 'pptx'
    if (ext === 'docx') return 'docx'
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    startUpload(file)
  }

  const startUpload = (file: File) => {
    const type = getFileType(file.name)
    if (!type) {
      setFileError('Unsupported file type. Only PDF (.pdf), PowerPoint (.pptx), and Word (.docx) are supported.')
      return
    }

    if (file.size > 30 * 1024 * 1024) {
      setFileError('File exceeds maximum size limit of 30 MB.')
      return
    }

    setSelectedFile(file)
    setFileError(null)
    setUploadProgress(0)
    setUploadedBytes(0)
    setTotalBytes(file.size)
    setUploadStatus('uploading')
    setDocProcessingStatus('idle')
    setIsSlow(false)
    setUploadSpeed('')
    setRemainingTime(null)

    fetch('/api/documents/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        fileType: type,
        fileSize: file.size,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initiate upload.')
        }
        return data
      })
      .then((data) => {
        const { documentId, uploadUrl } = data
        setUploadedDocId(documentId)

        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr
        const startTime = Date.now()
        let lastLoaded = 0
        let lastTime = Date.now()

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const now = Date.now()
            const percent = Math.min(100, Math.round((e.loaded / e.total) * 100))
            setUploadProgress(percent)
            setUploadedBytes(e.loaded)
            setTotalBytes(e.total)

            const elapsedSec = (now - startTime) / 1000
            if (elapsedSec > 0.2) {
              const speedBytesPerSec = e.loaded / elapsedSec
              const speedMBs = (speedBytesPerSec / (1024 * 1024)).toFixed(1)
              setUploadSpeed(`${speedMBs} MB/s`)

              const remainingBytes = Math.max(0, e.total - e.loaded)
              const sec = speedBytesPerSec > 0 ? Math.max(1, Math.round(remainingBytes / speedBytesPerSec)) : 0
              setRemainingTime(sec)
            }

            if (now - lastTime > 4000 && e.loaded === lastLoaded && percent < 100) {
              setIsSlow(true)
            } else {
              setIsSlow(false)
            }
            lastLoaded = e.loaded
            lastTime = now
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100)
            setUploadedBytes(file.size)
            setUploadStatus('completed')
            setDocProcessingStatus('processing')
            pollDocumentStatus(documentId)
          } else {
            let msg = 'Upload failed.'
            try {
              const errObj = JSON.parse(xhr.responseText)
              msg = errObj.error || msg
            } catch {}
            setUploadStatus('error')
            setFileError(msg)
          }
        }

        xhr.onerror = () => {
          setUploadStatus('error')
          setFileError('Network error during upload. Please retry.')
        }

        xhr.open('PUT', uploadUrl)
        xhr.send(file)
      })
      .catch((err) => {
        setUploadStatus('error')
        setFileError(err.message || 'Failed to initiate upload.')
      })
  }

  const pollDocumentStatus = (docId: string) => {
    let attempts = 0
    const maxAttempts = 30
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/documents/${docId}/status`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'ready') {
            setDocProcessingStatus('ready')
            clearInterval(interval)
          } else if (data.status === 'failed') {
            setDocProcessingStatus('failed')
            setFileError(data.errorMessage || 'Document processing failed.')
            clearInterval(interval)
          }
        }
      } catch {}

      if (attempts >= maxAttempts) {
        clearInterval(interval)
      }
    }, 1500)
  }

  const handleRemoveFile = () => {
    if (xhrRef.current && uploadStatus === 'uploading') {
      xhrRef.current.abort()
    }
    setSelectedFile(null)
    setUploadedDocId(null)
    setUploadStatus('idle')
    setDocProcessingStatus('idle')
    setUploadProgress(0)
    setUploadedBytes(0)
    setTotalBytes(0)
    setFileError(null)
    setIsSlow(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRetryUpload = () => {
    if (selectedFile) {
      startUpload(selectedFile)
    }
  }

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

    if (!selectedFile && !topic.trim()) {
      setError('Please provide a topic or upload a document.')
      return
    }

    if (selectedFile && uploadStatus === 'uploading') {
      setError('Please wait for the file upload to finish before generating.')
      return
    }

    if (selectedFile && uploadStatus === 'error') {
      setError('File upload failed. Please retry or remove the file.')
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
          documentId: uploadedDocId || null,
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

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setError(null)
    setSavedExamId(null)

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
          documentId: uploadedDocId || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate exam.')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred during regeneration.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!result) return
    setSaving(true)
    setError(null)

    try {
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
            documentId: result.documentId || uploadedDocId || null,
          },
          questions: result.questions,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save exam.')

      setSavedExamId(saveData.examId)
      // Invalidate and refresh database metrics in Zustand
      await useUserStore.getState().invalidateAndRefresh().catch(() => {})

      navigate({ to: '/my-exams' })
    } catch (err: any) {
      setError(err.message || 'Failed to save exam.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartPractice = async () => {
    if (!result) return
    setSaving(true)
    setError(null)

    try {
      let examId = savedExamId
      if (!examId) {
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
              documentId: result.documentId || uploadedDocId || null,
            },
            questions: result.questions,
          }),
        })

        const saveData = await saveRes.json()
        if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save exam.')
        examId = saveData.examId
        setSavedExamId(examId)
        await useUserStore.getState().invalidateAndRefresh().catch(() => {})
      }

      const attRes = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      })
      const attData = await attRes.json()
      if (!attRes.ok) throw new Error(attData.error || 'Failed to start attempt.')

      setIsPracticeModalOpen(false)
      navigate({
        to: '/practice/$attemptId',
        params: { attemptId: attData.attemptId },
        search: {
          batch: practiceBatch,
          mode: practiceMode,
        },
      })
    } catch (err: any) {
      setError(err.message || 'Failed to start practice session.')
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {selectedFile ? 'Focus / Instructions' : 'Topic or Questions'}{' '}
                {!selectedFile && <span className="text-[var(--color-danger)]">*</span>}
              </label>

              {/* Add File button directly beside the main text input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 cursor-pointer"
                title="Add reference document (PDF, PPTX, DOCX)"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add File</span>
              </button>
            </div>

            {/* Selected File UI ABOVE the main text input */}
            {selectedFile && (
              <div className="mb-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Circular Progress Indicator centered around/over the file icon */}
                  <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
                    {uploadStatus === 'completed' ? (
                      /* Clear GREEN CHECKMARK ✓ upon 100% completion */
                      <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <>
                        <svg className="absolute inset-0 h-10 w-10 -rotate-90">
                          {/* Neutral/grey background track */}
                          <circle
                            cx="20"
                            cy="20"
                            r={16}
                            fill="none"
                            stroke="var(--border-subtle)"
                            strokeWidth="2.5"
                          />
                          {/* Visible progress stroke */}
                          <circle
                            cx="20"
                            cy="20"
                            r={16}
                            fill="none"
                            stroke="var(--text-primary)"
                            strokeWidth="2.5"
                            strokeDasharray={2 * Math.PI * 16}
                            strokeDashoffset={
                              2 * Math.PI * 16 -
                              ((2 * Math.PI * 16) * uploadProgress) / 100
                            }
                            strokeLinecap="round"
                            className="transition-all duration-150"
                          />
                        </svg>
                        {/* File icon centered inside ring */}
                        <div className="relative z-10 flex items-center justify-center">
                          {getFileType(selectedFile.name) === 'pdf' ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : getFileType(selectedFile.name) === 'pptx' ? (
                            <Presentation className="h-4 w-4 text-amber-500" />
                          ) : (
                            <FileCode className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* File Metadata and Progress Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                      {selectedFile.name}
                    </p>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {uploadStatus === 'completed' ? (
                        <span>
                          {(totalBytes / (1024 * 1024)).toFixed(1)} MB /{' '}
                          {(totalBytes / (1024 * 1024)).toFixed(1)} MB · Uploaded
                        </span>
                      ) : uploadStatus === 'uploading' ? (
                        <span>
                          {(uploadedBytes / (1024 * 1024)).toFixed(1)} MB /{' '}
                          {(totalBytes / (1024 * 1024)).toFixed(1)} MB · {uploadProgress}%
                          {uploadSpeed ? ` · ${uploadSpeed}` : ''}
                          {remainingTime ? ` · ~${remainingTime} sec remaining` : ''}
                        </span>
                      ) : uploadStatus === 'error' ? (
                        <button
                          type="button"
                          onClick={handleRetryUpload}
                          className="text-[var(--color-danger)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Upload failed — tap to retry</span>
                        </button>
                      ) : null}
                    </div>

                    {isSlow && uploadStatus === 'uploading' && (
                      <p className="text-[11px] text-amber-500 mt-0.5">
                        Connection is slow. Upload still in progress...
                      </p>
                    )}

                    {fileError && uploadStatus !== 'error' && (
                      <p className="text-[11px] text-[var(--color-danger)] mt-0.5">
                        {fileError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cancel / Remove Control */}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg transition hover:bg-[var(--bg-surface)] shrink-0 cursor-pointer"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {fileError && !selectedFile && (
              <div className="mb-3 p-2.5 rounded-lg bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-xs flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                selectedFile && uploadStatus === 'completed'
                  ? 'Anything to focus on? e.g. weight more on chapter 4, section 2 (optional)'
                  : 'Enter a topic, concept, or specific questions you want tested...'
              }
              required={!selectedFile}
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
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {(['5', '10', '15', '20', '25', '30'] as const).map((num) => (
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
                  {num}Q
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
            disabled={
              loading ||
              (!topic.trim() && !selectedFile) ||
              (selectedFile !== null && uploadStatus !== 'completed')
            }
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
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setResult(null)}
                disabled={saving || isRegenerating}
                className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                title="Edit parameters in form"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Settings</span>
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={saving || isRegenerating}
                className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                title="Regenerate fresh questions in place"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={saving || isRegenerating}
                className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save to Library</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPracticeModalOpen(true)}
                disabled={saving || isRegenerating}
                className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Practice</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--color-danger-subtle)] border border-[rgba(239,68,68,0.25)] text-xs text-[var(--color-danger)] flex items-center gap-2">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Container with Frosted Regeneration Overlay */}
          <div className="relative min-h-[220px]">
            {/* Frosted Blur Overlay during in-place regeneration */}
            {isRegenerating && (
              <div className="absolute inset-0 z-20 backdrop-blur-md bg-[var(--bg-main)]/70 rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-[var(--border-subtle)] animate-fade-in shadow-xl">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--text-primary)] mb-3" />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Regenerating Exam with AI...
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                  Synthesizing fresh questions and verified answer keys based on your material.
                </p>
              </div>
            )}

            {/* Questions List (ONLY Question Text & Type — No Options or Answer Spoilers) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Generated Questions ({result.questions.length})
                </h3>
                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Choices & answer keys hidden for authentic practice</span>
                </span>
              </div>

              {result.questions.map((q, idx) => (
                <div key={idx} className="gen-card p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[10px] font-bold flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {q.type.replace('-', ' ')}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-relaxed pl-7">
                    {q.question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Practice Launch Setup Modal ─── */}
      {isPracticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="gen-card max-w-md w-full p-6 space-y-6 shadow-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Practice Session Setup
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Choose your question delivery and grading system
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPracticeModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg transition hover:bg-[var(--bg-surface-elevated)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Question Batching */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Question Delivery
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All at once' },
                  { id: '5', label: '5 at a time' },
                  { id: '1', label: '1 at a time' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPracticeBatch(b.id as any)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                      practiceBatch === b.id
                        ? 'btn-primary font-bold'
                        : 'btn-secondary text-[var(--text-secondary)]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Grading & Feedback System */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Grading & Feedback
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPracticeMode('instant')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    practiceMode === 'instant'
                      ? 'bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] ring-1 ring-[var(--border-strong)]'
                      : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                        practiceMode === 'instant'
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]'
                          : 'border-[var(--border-strong)]'
                      }`}
                    >
                      {practiceMode === 'instant' && <div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>Instant Feedback Mode</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded badge-success">Recommended</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Reveals right/wrong answers and concise explanations immediately upon selection, with on-demand AI tutor breakdowns.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPracticeMode('exam')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    practiceMode === 'exam'
                      ? 'bg-[var(--bg-surface-elevated)] border-2 border-[var(--border-strong)] ring-1 ring-[var(--border-strong)]'
                      : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                        practiceMode === 'exam'
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-main)]'
                          : 'border-[var(--border-strong)]'
                      }`}
                    >
                      {practiceMode === 'exam' && <div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-main)]" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      Exam Mode
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Standard test conditions. Keeps answers silent until submission, then delivers full score and detailed analytics.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPracticeModalOpen(false)}
                disabled={saving}
                className="btn-secondary px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartPractice}
                disabled={saving}
                className="btn-primary px-5 py-2 text-xs flex items-center gap-2 cursor-pointer font-semibold shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Preparing Session...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Practice Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
