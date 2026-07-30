import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, date, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** JSON array of active login methods: ["google"], ["email_password"], or ["google", "email_password"] */
  loginMethods: json("loginMethods").$type<string[]>().default(["email_password"]),
  /** Bcrypt hashed password for email/password login (null if not set) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// User Profiles
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  fullName: text("fullName"),
  avatarUrl: text("avatarUrl"),
  specialty: varchar("specialty", { length: 255 }),
  trainingYear: varchar("trainingYear", { length: 50 }),
  targetExam: varchar("targetExam", { length: 255 }),
  targetExamDate: date("targetExamDate"),
  country: varchar("country", { length: 100 }),
  currency: varchar("currency", { length: 10 }).default("GBP"),
  dailyQuestionGoal: int("dailyQuestionGoal").default(30),
  weeklyHourGoal: int("weeklyHourGoal").default(10),
  leaderboardOptIn: boolean("leaderboardOptIn").default(false),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }).default("inactive"),
  subscriptionPlan: varchar("subscriptionPlan", { length: 50 }),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// Two-Factor Authentication
export const twoFactorAuth = mysqlTable("two_factor_auth", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  secret: varchar("secret", { length: 255 }).notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  backupCodes: json("backupCodes").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Exams
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }), // 'uk', 'international'
  description: text("description"),
  passMark: decimal("passMark", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

// Questions
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull().references(() => exams.id),
  domain: varchar("domain", { length: 255 }),
  specialty: varchar("specialty", { length: 255 }),
  subSpecialty: varchar("subSpecialty", { length: 255 }),
  difficulty: mysqlEnum("difficulty", ["Easy", "Medium", "Hard"]),
  question: text("question").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  optionE: text("optionE"),
  correctAnswer: varchar("correctAnswer", { length: 10 }).notNull(),
  explanationCorrect: text("explanationCorrect"),
  explanationA: text("explanationA"),
  explanationB: text("explanationB"),
  explanationC: text("explanationC"),
  explanationD: text("explanationD"),
  explanationE: text("explanationE"),
  reference: text("reference"),
  tags: json("tags"),
  status: varchar("status", { length: 50 }).default("active"),
  attemptCount: int("attemptCount").default(0),
  correctCount: int("correctCount").default(0),
  flagCount: int("flagCount").default(0),
  reportCount: int("reportCount").default(0),
  topic: varchar("topic", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// User Attempts
export const userAttempts = mysqlTable("user_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  questionId: int("questionId").notNull().references(() => questions.id),
  examId: int("examId").notNull().references(() => exams.id),
  specialty: varchar("specialty", { length: 255 }),
  selectedAnswer: varchar("selectedAnswer", { length: 10 }),
  isCorrect: boolean("isCorrect"),
  timeTaken: int("timeTaken"),
  mode: varchar("mode", { length: 50 }),
  sessionId: int("sessionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAttempt = typeof userAttempts.$inferSelect;
export type InsertUserAttempt = typeof userAttempts.$inferInsert;

// Mock Exams
export const mocks = mysqlTable("mocks", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull().references(() => exams.id),
  name: varchar("name", { length: 255 }).notNull(),
  questionIds: json("questionIds"),
  timeLimit: int("timeLimit"),
  questionCount: int("questionCount"),
  passMark: decimal("passMark", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").default(true),
  rotationDate: date("rotationDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mock = typeof mocks.$inferSelect;
export type InsertMock = typeof mocks.$inferInsert;

// Mock Results
export const mockResults = mysqlTable("mock_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  mockId: int("mockId").notNull().references(() => mocks.id),
  examId: int("examId").notNull().references(() => exams.id),
  score: int("score"),
  totalQuestions: int("totalQuestions"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  timeTaken: int("timeTaken"),
  passed: boolean("passed"),
  answers: json("answers"),
  specialtyBreakdown: json("specialtyBreakdown"),
  domainBreakdown: json("domainBreakdown"),
  completedAt: timestamp("completedAt").defaultNow(),
  emailSent: boolean("emailSent").default(false),
});

export type MockResult = typeof mockResults.$inferSelect;
export type InsertMockResult = typeof mockResults.$inferInsert;

// Note360 Content
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull().references(() => exams.id),
  specialty: varchar("specialty", { length: 255 }).notNull(),
  title: text("title"),
  content: text("content"),
  niceGuideline: varchar("niceGuideline", { length: 100 }),
  niceUrl: text("niceUrl"),
  examPearl: text("examPearl"),
  highYieldCount: int("highYieldCount").default(0),
  curriculumVersion: varchar("curriculumVersion", { length: 50 }),
  lastUpdated: timestamp("lastUpdated").defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Pattern Recognition Cards
export const patternCards = mysqlTable("pattern_cards", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull().references(() => exams.id),
  specialty: varchar("specialty", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  briefExplanation: text("briefExplanation"),
  difficulty: varchar("difficulty", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatternCard = typeof patternCards.$inferSelect;
export type InsertPatternCard = typeof patternCards.$inferInsert;

// User Pattern Progress
export const userPatternProgress = mysqlTable("user_pattern_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  cardId: int("cardId").notNull().references(() => patternCards.id),
  masteryLevel: varchar("masteryLevel", { length: 50 }).default("learning"),
  lastReviewed: timestamp("lastReviewed"),
  reviewCount: int("reviewCount").default(0),
});

export type UserPatternProgress = typeof userPatternProgress.$inferSelect;
export type InsertUserPatternProgress = typeof userPatternProgress.$inferInsert;

// Subscriptions
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  planType: varchar("planType", { length: 50 }).notNull(),
  examId: int("examId").references(() => exams.id),
  status: varchar("status", { length: 50 }).notNull(),
  paymentProvider: varchar("paymentProvider", { length: 50 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEnd: timestamp("trialEnd"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Free Trials
export const freeTrials = mysqlTable("free_trials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  examId: int("examId").notNull().references(() => exams.id),
  assignedBy: int("assignedBy").references(() => users.id),
  trialStart: timestamp("trialStart"),
  trialEnd: timestamp("trialEnd"),
  used: boolean("used").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FreeTrial = typeof freeTrials.$inferSelect;
export type InsertFreeTrial = typeof freeTrials.$inferInsert;

// Bookmarks
export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  itemId: int("itemId"),
  itemType: varchar("itemType", { length: 50 }),
  examId: int("examId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// User Question Notes
export const userQuestionNotes = mysqlTable("user_question_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  questionId: int("questionId").notNull().references(() => questions.id),
  noteText: text("noteText"),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type UserQuestionNote = typeof userQuestionNotes.$inferSelect;
export type InsertUserQuestionNote = typeof userQuestionNotes.$inferInsert;

// Study Sessions
export const studySessions = mysqlTable("study_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  examId: int("examId"),
  sessionType: varchar("sessionType", { length: 50 }),
  questionsAnswered: int("questionsAnswered").default(0),
  correctAnswers: int("correctAnswers").default(0),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = typeof studySessions.$inferInsert;

// SCA Cases
export const scaCases = mysqlTable("sca_cases", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title"),
  category: varchar("category", { length: 255 }),
  difficulty: varchar("difficulty", { length: 50 }),
  patientName: varchar("patientName", { length: 255 }),
  patientAge: int("patientAge"),
  patientGender: varchar("patientGender", { length: 50 }),
  presentingComplaint: text("presentingComplaint"),
  backgroundContext: text("backgroundContext"),
  aiPatientPersona: text("aiPatientPersona"),
  markSheet: json("markSheet"),
  examinationFindings: text("examinationFindings"),
  investigationResults: json("investigationResults"),
  isActive: boolean("isActive").default(true),
  isFreeTrialCase: boolean("isFreeTrialCase").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScaCase = typeof scaCases.$inferSelect;
export type InsertScaCase = typeof scaCases.$inferInsert;

// SCA Consultations
export const scaConsultations = mysqlTable("sca_consultations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  caseId: int("caseId").notNull().references(() => scaCases.id),
  caseTitle: varchar("caseTitle", { length: 255 }),
  mode: varchar("mode", { length: 50 }),
  mockSessionId: int("mockSessionId"),
  transcript: json("transcript"),
  duration: int("duration"),
  domain1Score: int("domain1Score"),
  domain2Score: int("domain2Score"),
  domain3Score: int("domain3Score"),
  totalScore: int("totalScore"),
  passed: boolean("passed"),
  empathyScore: int("empathyScore"),
  aiFeedback: json("aiFeedback"),
  completedAt: timestamp("completedAt").defaultNow(),
  emailSent: boolean("emailSent").default(false),
});

export type ScaConsultation = typeof scaConsultations.$inferSelect;
export type InsertScaConsultation = typeof scaConsultations.$inferInsert;

// Coupons
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: varchar("discountType", { length: 50 }),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }),
  maxUsageCount: int("maxUsageCount"),
  usageCount: int("usageCount").default(0),
  expiryDate: date("expiryDate"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Coupon Usage
export const couponUsage = mysqlTable("coupon_usage", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull().references(() => coupons.id),
  userId: int("userId").notNull().references(() => users.id),
  subscriptionId: int("subscriptionId").references(() => subscriptions.id),
  usedAt: timestamp("usedAt").defaultNow(),
});

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = typeof couponUsage.$inferInsert;

// Coach Conversations
export const coachConversations = mysqlTable("coach_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  messages: json("messages"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type CoachConversation = typeof coachConversations.$inferSelect;
export type InsertCoachConversation = typeof coachConversations.$inferInsert;

// User Performance Model
export const userPerformanceModel = mysqlTable("user_performance_model", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  examId: int("examId"),
  specialtyScores: json("specialtyScores"),
  weakAreas: json("weakAreas"),
  strongAreas: json("strongAreas"),
  predictedPassProbability: decimal("predictedPassProbability", { precision: 5, scale: 2 }),
  lastCalculated: timestamp("lastCalculated").defaultNow(),
});

export type UserPerformanceModel = typeof userPerformanceModel.$inferSelect;
export type InsertUserPerformanceModel = typeof userPerformanceModel.$inferInsert;

// Admin Logs
export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull().references(() => users.id),
  action: text("action"),
  targetUserId: int("targetUserId"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;


// Flashcards (for SRS system)
export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull().references(() => exams.id),
  category: varchar("category", { length: 255 }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  tags: json("tags"),
  specialty: varchar("specialty", { length: 255 }),
  pattern: text("pattern"),
  answer: text("answer"),
  explanation: text("explanation"),
  niceGuideline: varchar("niceGuideline", { length: 255 }),
  difficulty: varchar("difficulty", { length: 50 }).default("Medium"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;

// User SRS Progress (SM-2 algorithm data)
export const userSrsProgress = mysqlTable("user_srs_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  flashcardId: int("flashcardId").notNull().references(() => flashcards.id),
  interval: int("interval").default(1),
  easeFactor: decimal("easeFactor", { precision: 5, scale: 2 }).default("2.5"),
  repetitions: int("repetitions").default(0),
  dueDate: date("dueDate"),
  lastReviewed: timestamp("lastReviewed"),
});

export type UserSrsProgress = typeof userSrsProgress.$inferSelect;
export type InsertUserSrsProgress = typeof userSrsProgress.$inferInsert;

// User Chat History (for AI Coach360)
export const userChatHistory = mysqlTable("user_chat_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).notNull(), // 'user' or 'assistant'
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserChatHistory = typeof userChatHistory.$inferSelect;
export type InsertUserChatHistory = typeof userChatHistory.$inferInsert;

// User Note Progress (for Note360 - tracks read status and bookmarks)
export const userNoteProgress = mysqlTable("user_note_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  noteId: int("noteId").notNull().references(() => notes.id),
  isRead: boolean("isRead").default(false).notNull(),
  isBookmarked: boolean("isBookmarked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userNoteUnique: uniqueIndex("user_note_unique").on(table.userId, table.noteId),
}));

export type UserNoteProgress = typeof userNoteProgress.$inferSelect;
export type InsertUserNoteProgress = typeof userNoteProgress.$inferInsert;

// Note Annotations (for Note360 - personal annotations on note sections)
export const noteAnnotations = mysqlTable("note_annotations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  noteId: int("noteId").notNull().references(() => notes.id),
  sectionId: varchar("sectionId", { length: 100 }).notNull(), // e.g., "diagnosis", "treatment", "referral"
  annotationText: text("annotationText").notNull(),
  highlightColor: varchar("highlightColor", { length: 20 }).default("yellow"), // yellow, green, red, blue, purple
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userNoteAnnotationUnique: uniqueIndex("user_note_annotation_unique").on(table.userId, table.noteId, table.sectionId),
}));

export type NoteAnnotation = typeof noteAnnotations.$inferSelect;
export type InsertNoteAnnotation = typeof noteAnnotations.$inferInsert;

// Picture360 Access (standalone £9 / 3-month product)
export const picture360Access = mysqlTable("picture360_access", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, expired
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Picture360Access = typeof picture360Access.$inferSelect;
export type InsertPicture360Access = typeof picture360Access.$inferInsert;

// ============================================================
// MSRA (Multi-Specialty Recruitment Assessment) Tables
// ============================================================

// MSRA Clinical Problem Solving Questions (SBA + EMQ)
export const msraCpsQuestions = mysqlTable("msra_cps_questions", {
  id: int("id").autoincrement().primaryKey(),
  examYear: varchar("examYear", { length: 10 }),
  questionType: mysqlEnum("questionType", ["SBA", "EMQ"]).notNull(),
  specialty: varchar("specialty", { length: 255 }),
  subSpecialty: varchar("subSpecialty", { length: 255 }),
  topic: varchar("topic", { length: 255 }),
  difficulty: mysqlEnum("difficulty", ["Easy", "Medium", "Hard"]),
  // SBA fields
  question: text("question"),
  optionA: text("optionA"),
  optionB: text("optionB"),
  optionC: text("optionC"),
  optionD: text("optionD"),
  optionE: text("optionE"),
  correctAnswer: varchar("correctAnswer", { length: 10 }),
  explanationCorrect: text("explanationCorrect"),
  explanationA: text("explanationA"),
  explanationB: text("explanationB"),
  explanationC: text("explanationC"),
  explanationD: text("explanationD"),
  explanationE: text("explanationE"),
  // EMQ fields
  emqTheme: text("emqTheme"),
  emqLeadStatement: text("emqLeadStatement"),
  emqOptions: json("emqOptions").$type<string[]>(),
  emqItems: json("emqItems").$type<{ stem: string; correctAnswer: string }[]>(),
  // Common fields
  reference: text("reference"),
  tags: text("tags"),
  status: varchar("status", { length: 50 }).default("active"),
  attemptCount: int("attemptCount").default(0),
  correctCount: int("correctCount").default(0),
  flagCount: int("flagCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MsraCpsQuestion = typeof msraCpsQuestions.$inferSelect;
export type InsertMsraCpsQuestion = typeof msraCpsQuestions.$inferInsert;

// MSRA Professional Dilemmas Questions (RANKING + PICK3)
export const msraPdQuestions = mysqlTable("msra_pd_questions", {
  id: int("id").autoincrement().primaryKey(),
  questionType: mysqlEnum("questionType", ["RANKING", "PICK3"]).notNull(),
  domain: varchar("domain", { length: 255 }),
  scenario: text("scenario"),
  // RANKING fields: rank 4-5 actions from most to least appropriate
  actionA: text("actionA"),
  actionB: text("actionB"),
  actionC: text("actionC"),
  actionD: text("actionD"),
  actionE: text("actionE"),
  correctRanking: json("correctRanking").$type<string[]>(),
  explanationRanking: text("explanationRanking"),
  // PICK3 fields: choose 3 most appropriate from 5
  optionA: text("optionA"),
  optionB: text("optionB"),
  optionC: text("optionC"),
  optionD: text("optionD"),
  optionE: text("optionE"),
  correctOptions: json("correctOptions").$type<string[]>(),
  explanationOptions: text("explanationOptions"),
  // Common fields
  reference: text("reference"),
  tags: json("tags"),
  status: varchar("status", { length: 50 }).default("active"),
  attemptCount: int("attemptCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MsraPdQuestion = typeof msraPdQuestions.$inferSelect;
export type InsertMsraPdQuestion = typeof msraPdQuestions.$inferInsert;

// MSRA Flashcards (spaced repetition)
export const msraFlashcards = mysqlTable("msra_flashcards", {
  id: int("id").autoincrement().primaryKey(),
  specialty: varchar("specialty", { length: 255 }),
  topic: varchar("topic", { length: 255 }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MsraFlashcard = typeof msraFlashcards.$inferSelect;
export type InsertMsraFlashcard = typeof msraFlashcards.$inferInsert;

// MSRA Waitlist (email capture for Coming Soon)
export const msraWaitlist = mysqlTable("msra_waitlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MsraWaitlistEntry = typeof msraWaitlist.$inferSelect;
export type InsertMsraWaitlistEntry = typeof msraWaitlist.$inferInsert;

// Question Flags (persistent per-user flagged questions)
export const questionFlags = mysqlTable("question_flags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  questionId: int("questionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestionFlag = typeof questionFlags.$inferSelect;
export type InsertQuestionFlag = typeof questionFlags.$inferInsert;
