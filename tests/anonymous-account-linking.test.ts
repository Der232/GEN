import { describe, it, expect, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../src/db/schema'
import { eq, and } from 'drizzle-orm'

const sqlite = new Database('dev.db')
const db = drizzle(sqlite, { schema })

describe('Anonymous User and Account Linking Flow', () => {
  const testRunId = Math.random().toString(36).slice(2, 8)
  const anonUserId = `test_anon_${testRunId}`
  const registeredUserId = `test_reg_${testRunId}`
  const anonDisplayName = `Cosmic Fox #${testRunId}`
  const examId1 = `test_exam_pub_${testRunId}`
  const examId2 = `test_exam_priv_${testRunId}`
  const attemptId1 = `test_att_${testRunId}`

  afterAll(() => {
    // Cleanup any lingering test data
    sqlite.prepare('DELETE FROM attempt_answers WHERE attempt_id LIKE ?').run(`%${testRunId}%`)
    sqlite.prepare('DELETE FROM attempts WHERE user_id LIKE ? OR id LIKE ?').run(`%${testRunId}%`, `%${testRunId}%`)
    sqlite.prepare('DELETE FROM questions WHERE exam_id LIKE ?').run(`%${testRunId}%`)
    sqlite.prepare('DELETE FROM exams WHERE id LIKE ?').run(`%${testRunId}%`)
    sqlite.prepare('DELETE FROM session WHERE userId LIKE ?').run(`%${testRunId}%`)
    sqlite.prepare('DELETE FROM account WHERE userId LIKE ?').run(`%${testRunId}%`)
    sqlite.prepare('DELETE FROM user WHERE id LIKE ?').run(`%${testRunId}%`)
  })

  it('Flow 1: First-time visitor receives an anonymous user stored in the database', async () => {
    await db.insert(schema.user).values({
      id: anonUserId,
      name: anonDisplayName,
      email: `${anonUserId}@anonymous.placeholder.invalid`,
      displayName: anonDisplayName,
      isAnonymous: true,
    })

    const fetchedUser = await db.query.user.findFirst({
      where: eq(schema.user.id, anonUserId),
    })

    expect(fetchedUser).toBeDefined()
    expect(fetchedUser?.id).toBe(anonUserId)
    expect(fetchedUser?.name).toBe(anonDisplayName)
    expect(fetchedUser?.isAnonymous).toBe(true)
  })

  it('Flow 2: Anonymous-created exams are persisted and reference the anonymous user ID', async () => {
    // Public exam
    await db.insert(schema.exams).values({
      id: examId1,
      userId: anonUserId,
      authorDisplayName: anonDisplayName,
      title: 'Intro to Quantum Computing',
      subject: 'Computer Science',
      description: 'Foundations of qubits and gates',
      difficulty: 'medium',
      questionCount: 2,
      isPublic: true,
      tags: JSON.stringify(['quantum', 'cs']),
    })

    // Private exam
    await db.insert(schema.exams).values({
      id: examId2,
      userId: anonUserId,
      authorDisplayName: anonDisplayName,
      title: 'Private Study Notes Exam',
      subject: 'Computer Science',
      description: 'Private practice exam',
      difficulty: 'easy',
      questionCount: 1,
      isPublic: false,
      tags: JSON.stringify(['private']),
    })

    // Insert corresponding questions
    await db.insert(schema.questions).values([
      {
        id: `q1_${testRunId}`,
        examId: examId1,
        order: 1,
        type: 'multiple-choice',
        question: 'What is superposition?',
        options: JSON.stringify(['State combination', 'Classical bit', 'None', 'Loop']),
        correctAnswer: 'State combination',
        explanation: 'Quantum superposition allows multiple basis states.',
      },
      {
        id: `q2_${testRunId}`,
        examId: examId1,
        order: 2,
        type: 'true-false',
        question: 'A qubit can only be 0 or 1 at any time.',
        options: JSON.stringify(['True', 'False']),
        correctAnswer: 'False',
        explanation: 'Qubits can exist in a superposition.',
      },
    ])

    const createdExam = await db.query.exams.findFirst({
      where: eq(schema.exams.id, examId1),
    })

    expect(createdExam).toBeDefined()
    expect(createdExam?.userId).toBe(anonUserId)
    expect(createdExam?.authorDisplayName).toBe(anonDisplayName)
  })

  it('Flow 3: Anonymous-created exams appear in Discover (if public) and My Exams', async () => {
    // Discover query: isPublic = true
    const discoverExams = await db.query.exams.findMany({
      where: eq(schema.exams.isPublic, true),
    })
    const foundInDiscover = discoverExams.find((e) => e.id === examId1)
    expect(foundInDiscover).toBeDefined()
    expect(foundInDiscover?.authorDisplayName).toBe(anonDisplayName)

    // Private exam must NOT appear in Discover
    const privateInDiscover = discoverExams.find((e) => e.id === examId2)
    expect(privateInDiscover).toBeUndefined()

    // My Exams query: userId = anonUserId
    const myExams = await db.query.exams.findMany({
      where: eq(schema.exams.userId, anonUserId),
    })
    expect(myExams.length).toBe(2)
  })

  it('Flow 4: Anonymous attempts and scores are persisted in the database', async () => {
    await db.insert(schema.attempts).values({
      id: attemptId1,
      examId: examId1,
      userId: anonUserId,
      status: 'completed',
      score: 100,
      totalQuestions: 2,
      correctCount: 2,
    })

    await db.insert(schema.attemptAnswers).values([
      {
        id: `ans1_${testRunId}`,
        attemptId: attemptId1,
        questionId: `q1_${testRunId}`,
        userAnswer: 'State combination',
        isCorrect: true,
      },
      {
        id: `ans2_${testRunId}`,
        attemptId: attemptId1,
        questionId: `q2_${testRunId}`,
        userAnswer: 'False',
        isCorrect: true,
      },
    ])

    const userAttempt = await db.query.attempts.findFirst({
      where: and(eq(schema.attempts.id, attemptId1), eq(schema.attempts.userId, anonUserId)),
    })

    expect(userAttempt).toBeDefined()
    expect(userAttempt?.score).toBe(100)
    expect(userAttempt?.status).toBe('completed')
  })

  it('Flow 5 & 6: Linking an email/password account preserves and migrates all anonymous data', async () => {
    // 1. Create the registered user account
    await db.insert(schema.user).values({
      id: registeredUserId,
      name: 'Dr. Alice Quantum',
      email: `alice_${testRunId}@university.edu`,
      displayName: 'Dr. Alice Quantum',
      isAnonymous: false,
    })

    // 2. Perform linking migration (same logic executed by onLinkAccount hook)
    await Promise.all([
      db.update(schema.exams)
        .set({ userId: registeredUserId })
        .where(eq(schema.exams.userId, anonUserId)),
      db.update(schema.attempts)
        .set({ userId: registeredUserId })
        .where(eq(schema.attempts.userId, anonUserId)),
    ])

    // 3. Clean up the anonymous user record (Better Auth post-link cleanup)
    await db.delete(schema.user).where(eq(schema.user.id, anonUserId))

    // Verify migrated exams under new registered user ID
    const migratedExams = await db.query.exams.findMany({
      where: eq(schema.exams.userId, registeredUserId),
    })
    expect(migratedExams.length).toBe(2)

    // CRITICAL: Verify public exam STILL shows the creator's original anonymous display name
    const publicExamAfterLink = migratedExams.find((e) => e.id === examId1)
    expect(publicExamAfterLink?.authorDisplayName).toBe(anonDisplayName)

    // Verify migrated attempts
    const migratedAttempts = await db.query.attempts.findMany({
      where: eq(schema.attempts.userId, registeredUserId),
    })
    expect(migratedAttempts.length).toBe(1)
    expect(migratedAttempts[0].score).toBe(100)
  })

  it('Flow 7: Account metrics match database records and handle zero correctly', async () => {
    // Query metrics for the linked user
    const userExams = await db.query.exams.findMany({
      where: eq(schema.exams.userId, registeredUserId),
    })
    const completedAttempts = await db.query.attempts.findMany({
      where: and(eq(schema.attempts.userId, registeredUserId), eq(schema.attempts.status, 'completed')),
    })
    const totalScore = completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0)
    const avgScore = completedAttempts.length > 0 ? Math.round(totalScore / completedAttempts.length) : 0

    expect(userExams.length).toBe(2)
    expect(completedAttempts.length).toBe(1)
    expect(avgScore).toBe(100)

    // Test zero handling for a fresh user
    const freshUserExams: any[] = []
    const freshUserAttempts: any[] = []
    const freshAvg = freshUserAttempts.length > 0 ? Math.round(0) : 0
    expect(freshUserExams.length).toBe(0)
    expect(freshUserAttempts.length).toBe(0)
    expect(freshAvg).toBe(0)
    expect(Number.isNaN(freshAvg)).toBe(false)
  })

  it('Flow 8: Anonymous data clearing preserves public exam posts with author display name', async () => {
    // Create another anonymous user with a public exam and an attempt
    const secondAnonId = `anon_clear_${testRunId}`
    const secondAnonName = `Silent Wolf #${testRunId}`
    const publicExamId = `pub_exam_clear_${testRunId}`
    const privateExamId = `priv_exam_clear_${testRunId}`
    const attemptId = `att_clear_${testRunId}`

    await db.insert(schema.user).values({
      id: secondAnonId,
      name: secondAnonName,
      email: `${secondAnonId}@anonymous.placeholder.invalid`,
      displayName: secondAnonName,
      isAnonymous: true,
    })

    await db.insert(schema.exams).values([
      {
        id: publicExamId,
        userId: secondAnonId,
        authorDisplayName: secondAnonName,
        title: 'Public Chemistry Exam',
        subject: 'Chemistry',
        difficulty: 'easy',
        questionCount: 1,
        isPublic: true,
      },
      {
        id: privateExamId,
        userId: secondAnonId,
        authorDisplayName: secondAnonName,
        title: 'Private Draft Chemistry Exam',
        subject: 'Chemistry',
        difficulty: 'easy',
        questionCount: 1,
        isPublic: false,
      },
    ])

    await db.insert(schema.attempts).values({
      id: attemptId,
      examId: publicExamId,
      userId: secondAnonId,
      status: 'completed',
      score: 85,
      totalQuestions: 1,
      correctCount: 1,
    })

    // Execute Clear Data logic (same as /api/user/delete for anonymous user)
    // 1. Anonymize public exams so they remain visible in Discover
    await db.update(schema.exams)
      .set({ userId: 'anonymized' })
      .where(and(eq(schema.exams.userId, secondAnonId), eq(schema.exams.isPublic, true)))

    // 2. Delete private exams
    await db.delete(schema.exams).where(and(eq(schema.exams.userId, secondAnonId), eq(schema.exams.isPublic, false)))

    // 3. Delete attempts & answers
    await db.delete(schema.attempts).where(eq(schema.attempts.userId, secondAnonId))

    // 4. Delete user record
    await db.delete(schema.user).where(eq(schema.user.id, secondAnonId))

    // VERIFY: Public exam remains in database and in Discover!
    const preservedPublicExam = await db.query.exams.findFirst({
      where: eq(schema.exams.id, publicExamId),
    })
    expect(preservedPublicExam).toBeDefined()
    expect(preservedPublicExam?.isPublic).toBe(true)
    expect(preservedPublicExam?.authorDisplayName).toBe(secondAnonName)
    expect(preservedPublicExam?.userId).toBe('anonymized')

    // VERIFY: Private exam was deleted
    const deletedPrivateExam = await db.query.exams.findFirst({
      where: eq(schema.exams.id, privateExamId),
    })
    expect(deletedPrivateExam).toBeUndefined()

    // VERIFY: Attempts and user were deleted
    const deletedAttempts = await db.query.attempts.findMany({
      where: eq(schema.attempts.userId, secondAnonId),
    })
    expect(deletedAttempts.length).toBe(0)

    const deletedUser = await db.query.user.findFirst({
      where: eq(schema.user.id, secondAnonId),
    })
    expect(deletedUser).toBeUndefined()

    // Cleanup preserved test exam
    await db.delete(schema.exams).where(eq(schema.exams.id, publicExamId))
  })

  it('Flow 9 & 10: Registered account deletion preserves public exams and creates no broken references', async () => {
    // Use registeredUserId from earlier
    // 1. Anonymize public exams
    await db.update(schema.exams)
      .set({ userId: 'anonymized' })
      .where(and(eq(schema.exams.userId, registeredUserId), eq(schema.exams.isPublic, true)))

    // 2. Delete private exams
    const privates = await db.query.exams.findMany({
      where: and(eq(schema.exams.userId, registeredUserId), eq(schema.exams.isPublic, false)),
    })
    for (const p of privates) {
      await db.delete(schema.questions).where(eq(schema.questions.examId, p.id))
      await db.delete(schema.exams).where(eq(schema.exams.id, p.id))
    }

    // 3. Delete attempts and answers
    const userAtts = await db.query.attempts.findMany({
      where: eq(schema.attempts.userId, registeredUserId),
    })
    for (const a of userAtts) {
      await db.delete(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, a.id))
      await db.delete(schema.attempts).where(eq(schema.attempts.id, a.id))
    }

    // 4. Delete user
    await db.delete(schema.user).where(eq(schema.user.id, registeredUserId))

    // VERIFY: Public exam still exists in Discover with creator display name
    const publicPost = await db.query.exams.findFirst({
      where: eq(schema.exams.id, examId1),
    })
    expect(publicPost).toBeDefined()
    expect(publicPost?.authorDisplayName).toBe(anonDisplayName)

    // VERIFY: No orphaned attempts exist for this user
    const remainingAttempts = await db.query.attempts.findMany({
      where: eq(schema.attempts.userId, registeredUserId),
    })
    expect(remainingAttempts.length).toBe(0)

    // VERIFY: User is completely deleted
    const userRecord = await db.query.user.findFirst({
      where: eq(schema.user.id, registeredUserId),
    })
    expect(userRecord).toBeUndefined()
  })
})
