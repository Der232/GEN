import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ExamSessionState {
	hasHydrated: boolean;
	activeAttemptId: string | null;
	examId: string | null;
	userAnswers: Record<string, string>; // questionId -> answer string
	currentBatchIndex: number;
	batchSize: number;

	// Actions
	setHasHydrated: (hydrated: boolean) => void;
	initSession: (params: {
		attemptId: string;
		examId: string;
		batchSize: number;
		initialAnswers?: Record<string, string>;
	}) => void;
	setAnswer: (questionId: string, answer: string) => void;
	setBatchIndex: (batchIndex: number) => void;
	clearSession: () => void;
}

export const useExamSessionStore = create<ExamSessionState>()(
	persist(
		(set) => ({
			hasHydrated: false,
			activeAttemptId: null,
			examId: null,
			userAnswers: {},
			currentBatchIndex: 0,
			batchSize: 1,

			setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

			initSession: ({ attemptId, examId, batchSize, initialAnswers = {} }) => {
				set((state) => {
					// If we are continuing the exact same attempt, preserve already selected answers
					const isSameAttempt = state.activeAttemptId === attemptId;
					const effectiveBatch = Math.max(batchSize, 1);
					const mergedAnswers = isSameAttempt
						? { ...initialAnswers, ...state.userAnswers }
						: { ...initialAnswers };

					const answeredCount = Object.keys(mergedAnswers).length;
					const minBatchFromAnswers = Math.floor(
						answeredCount / effectiveBatch,
					);
					const savedBatch = isSameAttempt ? state.currentBatchIndex : 0;
					const currentBatchIndex = Math.max(savedBatch, minBatchFromAnswers);

					return {
						activeAttemptId: attemptId,
						examId,
						batchSize: effectiveBatch,
						currentBatchIndex,
						userAnswers: mergedAnswers,
					};
				});
			},

			setAnswer: (questionId: string, answer: string) => {
				set((state) => ({
					userAnswers: {
						...state.userAnswers,
						[questionId]: answer,
					},
				}));
			},

			setBatchIndex: (batchIndex: number) => {
				set({ currentBatchIndex: Math.max(batchIndex, 0) });
			},

			clearSession: () => {
				set({
					activeAttemptId: null,
					examId: null,
					userAnswers: {},
					currentBatchIndex: 0,
					batchSize: 1,
				});
			},
		}),
		{
			name: "gen-active-exam-session-store",
			storage: createJSONStorage(() => localStorage),
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
		},
	),
);
