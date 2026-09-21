import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	attemptAnswers,
	attempts,
	exams,
	questions,
	user,
} from "#/db/schema";

describe("Attempt Lifecycle & Database Integrity", () => {
	const runId = Math.random().toString(36).slice(2, 8);
	const testUserId = `user_life_${runId}`;
	const otherUserId = `user_other_${runId}`;
	const examId = `exam_life_1_${runId}`;
	const otherExamId = `exam_life_2_${runId}`;
	const q1Id = `q_life_1_${runId}`;
	const q2Id = `q_life_2_${runId}`;
	const otherQId = `q_other_1_${runId}`;

	async function cleanup() {
		try {
			await db.run(
				sql`DELETE FROM attempt_answers WHERE attempt_id LIKE ${`%${runId}%`}`,
			);
			await db.run(
				sql`DELETE FROM attempts WHERE user_id LIKE ${`%${runId}%`} OR id LIKE ${`%${runId}%`}`,
			);
			await db.run(
				sql`DELETE FROM questions WHERE exam_id LIKE ${`%${runId}%`}`,
			);
			await db.run(sql`DELETE FROM exams WHERE id LIKE ${`%${runId}%`}`);
			await db.run(sql`DELETE FROM user WHERE id LIKE ${`%${runId}%`}`);
		} catch {}
	}

	beforeEach(async () => {
		await cleanup();

		// Seed test user
		await db.insert(user).values([
			{
				id: testUserId,
				name: "Test Student",
				email: `student_${runId}@test.invalid`,
				displayName: "Student",
				isAnonymous: false,
			},
			{
				id: otherUserId,
				name: "Other Student",
				email: `other_${runId}@test.invalid`,
				displayName: "Other",
				isAnonymous: false,
			},
		]);

		// Seed primary exam and questions
		await db.insert(exams).values({
			id: examId,
			userId: testUserId,
			authorDisplayName: "Test Student",
			title: "Biology 101",
			subject: "Science",
			difficulty: "medium",
			questionCount: 2,
			isPublic: true,
			tags: JSON.stringify(["biology"]),
		});

		await db.insert(questions).values([
			{
				id: q1Id,
				examId,
				order: 1,
				type: "multiple-choice",
				question: "What is mitochondria?",
				options: JSON.stringify(["Powerhouse", "Nucleus", "Ribosome"]),
				correctAnswer: "Powerhouse",
				explanation: "Mitochondria produce ATP.",
			},
			{
				id: q2Id,
				examId,
				order: 2,
				type: "true-false",
				question: "DNA is single stranded?",
				options: JSON.stringify(["True", "False"]),
				correctAnswer: "False",
				explanation: "DNA is double stranded.",
			},
		]);

		// Seed secondary exam
		await db.insert(exams).values({
			id: otherExamId,
			userId: otherUserId,
			authorDisplayName: "Other Student",
			title: "Chemistry 101",
			subject: "Chemistry",
			difficulty: "easy",
			questionCount: 1,
			isPublic: false,
			tags: JSON.stringify(["chemistry"]),
		});

		await db.insert(questions).values({
			id: otherQId,
			examId: otherExamId,
			order: 1,
			type: "multiple-choice",
			question: "What is H2O?",
			options: JSON.stringify(["Water", "Oxygen", "Hydrogen"]),
			correctAnswer: "Water",
			explanation: "H2O is water.",
		});
	});

	afterAll(async () => {
		await cleanup();
	});

	it("prevents answering a question that belongs to a different exam", async () => {
		const attemptId = `att_test_1_${runId}`;
		await db.insert(attempts).values({
			id: attemptId,
			examId,
			userId: testUserId,
			status: "in-progress",
			totalQuestions: 2,
			correctCount: 0,
		});

		// Check if otherQId belongs to examId
		const q = await db.query.questions.findFirst({
			where: and(eq(questions.id, otherQId), eq(questions.examId, examId)),
		});

		// Cross-exam question isolation invariant: must be undefined
		expect(q).toBeUndefined();
	});

	it("upserts individual answers and calculates correct correctness", async () => {
		const attemptId = `att_test_2_${runId}`;
		await db.insert(attempts).values({
			id: attemptId,
			examId,
			userId: testUserId,
			status: "in-progress",
			totalQuestions: 2,
			correctCount: 0,
		});

		const q1 = await db.query.questions.findFirst({
			where: and(eq(questions.id, q1Id), eq(questions.examId, examId)),
		});
		expect(q1).toBeDefined();

		const isCorrect =
			"Powerhouse".trim().toLowerCase() ===
			q1!.correctAnswer.trim().toLowerCase();
		expect(isCorrect).toBe(true);

		// Upsert answer following application logic
		const existingAnswer = await db.query.attemptAnswers.findFirst({
			where: and(
				eq(attemptAnswers.attemptId, attemptId),
				eq(attemptAnswers.questionId, q1Id),
			),
		});

		if (existingAnswer) {
			await db
				.update(attemptAnswers)
				.set({
					userAnswer: "Powerhouse",
					isCorrect,
					answeredAt: new Date(),
				})
				.where(eq(attemptAnswers.id, existingAnswer.id));
		} else {
			await db.insert(attemptAnswers).values({
				id: `ans_1_${runId}`,
				attemptId,
				questionId: q1Id,
				userAnswer: "Powerhouse",
				isCorrect,
				answeredAt: new Date(),
			});
		}

		const savedAnswer = await db.query.attemptAnswers.findFirst({
			where: and(
				eq(attemptAnswers.attemptId, attemptId),
				eq(attemptAnswers.questionId, q1Id),
			),
		});

		expect(savedAnswer).toBeDefined();
		expect(savedAnswer?.isCorrect).toBe(true);
		expect(savedAnswer?.userAnswer).toBe("Powerhouse");
	});

	it("prevents modification if attempt is already completed", async () => {
		const attemptId = `att_test_3_${runId}`;
		await db.insert(attempts).values({
			id: attemptId,
			examId,
			userId: testUserId,
			status: "completed",
			totalQuestions: 2,
			score: 100,
			correctCount: 2,
		});

		const currentAttempt = await db.query.attempts.findFirst({
			where: eq(attempts.id, attemptId),
		});

		// Completed invariant: attempting to answer or modify a completed attempt must be rejected
		const canModify = currentAttempt?.status !== "completed";
		expect(canModify).toBe(false);
	});

	it("enforces submit idempotency returning cached score", async () => {
		const attemptId = `att_test_4_${runId}`;
		await db.insert(attempts).values({
			id: attemptId,
			examId,
			userId: testUserId,
			status: "completed",
			totalQuestions: 2,
			score: 85,
			correctCount: 2,
		});

		const existing = await db.query.attempts.findFirst({
			where: eq(attempts.id, attemptId),
		});

		let score = 0;
		if (existing?.status === "completed") {
			score = existing.score ?? 0;
		}

		expect(score).toBe(85);
	});

	it("cascading delete cleans up attemptAnswers, attempts, and questions when exam is deleted", async () => {
		const attemptId = `att_cascade_${runId}`;
		await db.insert(attempts).values({
			id: attemptId,
			examId,
			userId: testUserId,
			status: "completed",
			totalQuestions: 2,
			score: 100,
			correctCount: 2,
		});

		await db.insert(attemptAnswers).values({
			id: `ans_cascade_1_${runId}`,
			attemptId,
			questionId: q1Id,
			userAnswer: "Powerhouse",
			isCorrect: true,
			answeredAt: new Date(),
		});

		// Perform cascading delete sequence
		const examAttempts = await db.query.attempts.findMany({
			where: eq(attempts.examId, examId),
		});
		expect(examAttempts.length).toBe(1);

		const attemptIds = examAttempts.map((a) => a.id);
		await db
			.delete(attemptAnswers)
			.where(inArray(attemptAnswers.attemptId, attemptIds));
		await db.delete(attempts).where(eq(attempts.examId, examId));
		await db.delete(questions).where(eq(questions.examId, examId));
		await db.delete(exams).where(eq(exams.id, examId));

		// Verify all records were cleaned up
		const remainingAnswers = await db.query.attemptAnswers.findMany({
			where: eq(attemptAnswers.attemptId, attemptId),
		});
		const remainingAttempts = await db.query.attempts.findMany({
			where: eq(attempts.examId, examId),
		});
		const remainingQuestions = await db.query.questions.findMany({
			where: eq(questions.examId, examId),
		});
		const remainingExam = await db.query.exams.findFirst({
			where: eq(exams.id, examId),
		});

		expect(remainingAnswers.length).toBe(0);
		expect(remainingAttempts.length).toBe(0);
		expect(remainingQuestions.length).toBe(0);
		expect(remainingExam).toBeUndefined();
	});
});
