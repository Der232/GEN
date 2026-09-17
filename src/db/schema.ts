import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Better Auth Tables ───────────────────────────────────────────────────────
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  displayName: text('displayName'),
  isAnonymous: integer('isAnonymous', { mode: 'boolean' }).default(false),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

// ─── Documents ───────────────────────────────────────────────────────────────
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileType: text('file_type', { enum: ['pdf', 'pptx', 'docx'] }).notNull(),
  fileSize: integer('file_size').notNull(),
  r2Key: text('r2_key').notNull(),
  status: text('status', {
    enum: ['uploading', 'uploaded', 'processing', 'ready', 'failed'],
  }).notNull().default('uploading'),
  extractedText: text('extracted_text'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// ─── Exams ───────────────────────────────────────────────────────────────────
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'set null' }),
  authorDisplayName: text('author_display_name').notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull().default(''),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
  questionCount: integer('question_count').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  tags: text('tags').notNull().default('[]'), // JSON array string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// ─── Questions ───────────────────────────────────────────────────────────────
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  type: text('type', { enum: ['multiple-choice', 'true-false', 'short-answer'] }).notNull(),
  question: text('question').notNull(),
  options: text('options'), // JSON array string, null for short-answer
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
})

// ─── Attempts ────────────────────────────────────────────────────────────────
export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  status: text('status', { enum: ['in-progress', 'completed', 'abandoned'] }).notNull().default('in-progress'),
  score: integer('score'), // 0–100, null until submitted
  totalQuestions: integer('total_questions').notNull(),
  correctCount: integer('correct_count'), // null until submitted
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// ─── Attempt Answers ─────────────────────────────────────────────────────────
export const attemptAnswers = sqliteTable('attempt_answers', {
  id: text('id').primaryKey(),
  attemptId: text('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userAnswer: text('user_answer').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Exam = typeof exams.$inferSelect
export type NewExam = typeof exams.$inferInsert
export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type Attempt = typeof attempts.$inferSelect
export type NewAttempt = typeof attempts.$inferInsert
export type AttemptAnswer = typeof attemptAnswers.$inferSelect
export type NewAttemptAnswer = typeof attemptAnswers.$inferInsert
