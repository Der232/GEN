import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type MasteryLevel = 'mastered' | 'proficient' | 'needs-review'

export interface QuestionPerformanceRecord {
  questionId: string
  examId?: string
  timesAttempted: number
  timesCorrect: number
  lastAttemptedAt: string
  lastUserAnswer: string
  isLastCorrect: boolean
  masteryLevel: MasteryLevel
}

export interface ExamHistoryRecord {
  examId: string
  bestScore: number
  lastScore: number
  totalAttempts: number
  lastAttemptAt: string
  totalQuestions: number
}

interface ExamPerformanceState {
  hasHydrated: boolean
  totalQuestionsAnswered: number
  totalQuestionsCorrect: number
  completedExamAttempts: number
  questionPerformance: Record<string, QuestionPerformanceRecord>
  examHistory: Record<string, ExamHistoryRecord>

  // Actions
  setHasHydrated: (hydrated: boolean) => void
  recordQuestionAnswer: (payload: {
    questionId: string
    examId?: string
    userAnswer: string
    isCorrect: boolean
  }) => void
  recordAttemptCompletion: (payload: {
    attemptId: string
    examId: string
    score: number
    totalQuestions: number
    correctCount: number
    answers?: Array<{ questionId: string; userAnswer: string; isCorrect: boolean }>
  }) => void
  getQuestionPerformance: (questionId: string) => QuestionPerformanceRecord | undefined
  getExamHistory: (examId: string) => ExamHistoryRecord | undefined
  syncWithServer: (serverStats: { examsCreated: number; examsTaken: number; averageScore: number }) => void
  clearAllPerformanceData: () => void
}

function calculateMastery(timesAttempted: number, timesCorrect: number): MasteryLevel {
  if (timesAttempted === 0) return 'needs-review'
  const accuracy = timesCorrect / timesAttempted
  if (timesAttempted >= 2 && accuracy >= 0.8) return 'mastered'
  if (accuracy >= 0.6) return 'proficient'
  return 'needs-review'
}

export const useExamPerformanceStore = create<ExamPerformanceState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      totalQuestionsAnswered: 0,
      totalQuestionsCorrect: 0,
      completedExamAttempts: 0,
      questionPerformance: {},
      examHistory: {},

      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

      recordQuestionAnswer: ({ questionId, examId, userAnswer, isCorrect }) => {
        set((state) => {
          const prevRecord = state.questionPerformance[questionId]
          const timesAttempted = (prevRecord?.timesAttempted || 0) + 1
          const timesCorrect = (prevRecord?.timesCorrect || 0) + (isCorrect ? 1 : 0)
          const masteryLevel = calculateMastery(timesAttempted, timesCorrect)

          const updatedQuestionRecord: QuestionPerformanceRecord = {
            questionId,
            examId: examId || prevRecord?.examId,
            timesAttempted,
            timesCorrect,
            lastAttemptedAt: new Date().toISOString(),
            lastUserAnswer: userAnswer,
            isLastCorrect: isCorrect,
            masteryLevel,
          }

          return {
            totalQuestionsAnswered: state.totalQuestionsAnswered + 1,
            totalQuestionsCorrect: state.totalQuestionsCorrect + (isCorrect ? 1 : 0),
            questionPerformance: {
              ...state.questionPerformance,
              [questionId]: updatedQuestionRecord,
            },
          }
        })
      },

      recordAttemptCompletion: ({
        examId,
        score,
        totalQuestions,
        correctCount,
        answers,
      }) => {
        set((state) => {
          // 1. Update exam history
          const prevExam = state.examHistory[examId]
          const updatedExam: ExamHistoryRecord = {
            examId,
            bestScore: Math.max(score, prevExam?.bestScore || 0),
            lastScore: score,
            totalAttempts: (prevExam?.totalAttempts || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
            totalQuestions,
          }

          // 2. Update individual question performance records if provided
          const updatedQuestions = { ...state.questionPerformance }
          if (answers && Array.isArray(answers)) {
            for (const ans of answers) {
              const prevQ = updatedQuestions[ans.questionId]
              const timesAttempted = (prevQ?.timesAttempted || 0) + 1
              const timesCorrect = (prevQ?.timesCorrect || 0) + (ans.isCorrect ? 1 : 0)
              updatedQuestions[ans.questionId] = {
                questionId: ans.questionId,
                examId,
                timesAttempted,
                timesCorrect,
                lastAttemptedAt: new Date().toISOString(),
                lastUserAnswer: ans.userAnswer,
                isLastCorrect: ans.isCorrect,
                masteryLevel: calculateMastery(timesAttempted, timesCorrect),
              }
            }
          }

          return {
            completedExamAttempts: state.completedExamAttempts + 1,
            examHistory: {
              ...state.examHistory,
              [examId]: updatedExam,
            },
            questionPerformance: updatedQuestions,
          }
        })
      },

      getQuestionPerformance: (questionId: string) => {
        return get().questionPerformance[questionId]
      },

      getExamHistory: (examId: string) => {
        return get().examHistory[examId]
      },

      syncWithServer: (serverStats) => {
        set((state) => ({
          completedExamAttempts: Math.max(state.completedExamAttempts, serverStats.examsTaken),
        }))
      },

      clearAllPerformanceData: () => {
        set({
          totalQuestionsAnswered: 0,
          totalQuestionsCorrect: 0,
          completedExamAttempts: 0,
          questionPerformance: {},
          examHistory: {},
        })
      },
    }),
    {
      name: 'gen-exam-performance-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
