# Question Grove 360 — Development TODO

## Phase 1: Database Schema & Infrastructure
- [x] Design and implement complete Supabase-compatible database schema with all tables
- [x] Create Drizzle ORM schema with all tables: users, profiles, exams, questions, subscriptions, etc.
- [x] Set up database migrations and Row Level Security (RLS) policies
- [x] Configure environment variables for Stripe, Anthropic Claude, ElevenLabs, Deepgram, Resend
- [ ] Set up Supabase Edge Functions for payment webhooks and email triggers

## Phase 2: Authentication & User Management
- [x] Implement email/password registration and login (via Manus OAuth)
- [x] Implement Google OAuth sign-in (via Manus OAuth)
- [x] Implement role-based access control (user/admin roles)
- [x] Build user profile page with specialty, training year, target exam, country
- [ ] Implement password reset functionality
- [ ] Add 2FA option (TOTP via authenticator app)
- [x] Build session management and "remember me" functionality

## Phase 3: Core UI & Navigation
- [x] Design premium, elegant visual system (color palette, typography, spacing)
- [x] Build responsive navigation bar with logo and user menu
- [x] Create landing page with feature highlights and CTA
- [x] Build main dashboard layout with sidebar navigation
- [x] Implement theme system (light/dark mode)
- [x] Create 404 and error pages

## Phase 4: Question Bank Feature
- [x] Design question card component with vignette formatting
- [x] Implement question filtering system (specialty, difficulty, status, tags)
- [x] Build tutor mode with immediate feedback
- [x] Build exam mode with end-of-exam feedback
- [x] Implement question bookmarking and flagging
- [x] Add personal note-taking per question
- [ ] Build progress tracking (accuracy %, specialty breakdown)
- [ ] Implement "Explain this further" button with Claude AI integration
- [ ] Add related questions suggestion
- [ ] Create session summary after study sessions

## Phase 5: Mock Exams Feature
- [x] Design mock exam interface with full-screen immersive mode
- [x] Implement countdown timer with visual urgency indicators (ExamTimer component)
- [ ] Build question navigation and flagging during exam
- [x] Implement auto-submit on time expiry
- [x] Create post-exam results screen with animated score reveal (ExamResults component)
- [x] Build score breakdown by specialty/domain (bar chart)
- [x] Implement comparison to previous attempts (line chart)
- [x] Add comparison to platform average
- [ ] Generate and email full PDF report within 5 minutes
- [ ] Create downloadable PDF score report

## Phase 6: Note360 Study Notes Feature
- [x] Build Note360 landing page with specialty cards and completion tracking
- [x] Create specialty detail pages with exam-focused revision notes
- [x] Implement search across all Note360 content
- [ ] Add bookmark functionality for note sections
- [ ] Implement personal annotation system for notes
- [ ] Add print/PDF export functionality
- [x] Display last updated date and curriculum version

## Phase 7: Pattern Recognition Flashcards
- [x] Design flashcard component with 3D flip animation
- [ ] Implement swipe gestures (left/right) for mobile
- [x] Build mastery level tracking (Learning/Reviewing/Mastered)
- [ ] Add specialty filtering
- [x] Create stats dashboard (total cards, % mastered, daily progress)
- [x] Implement spaced repetition algorithm (SM-2)

## Phase 8: User Dashboard
- [ ] Build dashboard overview with key metrics
- [ ] Implement study streak tracking with visual calendar
- [ ] Create accuracy trends chart
- [ ] Build pass probability gauge with trend indicator
- [ ] Display daily goals and progress
- [ ] Show upcoming mock exam schedule
- [ ] Implement weak area detection and recommendations
- [ ] Add session summary cards

## Phase 9: Subscription & Pricing
- [x] Design pricing page with subscription tiers
- [x] Implement Stripe payment integration (framework + checkout)
- [x] Build coupon/discount code system (schema ready)
- [ ] Create free trial assignment system (admin-controlled)
- [x] Implement subscription management (cancel, upgrade, downgrade)
- [ ] Build payment failure retry logic
- [x] Add invoice/receipt download functionality
- [ ] Create subscription status page

## Phase 10: SCA AI Consultation Simulator
- [x] Design SCA case selection interface
- [x] Implement real-time voice capture with Deepgram STT (VoiceRecorder)
- [ ] Integrate ElevenLabs for AI patient voice synthesis
- [x] Build Claude AI patient persona and response generation (voiceEndpoint)
- [x] Create real-time transcript display
- [x] Implement domain scoring system (3 domains)
- [x] Build consultation feedback with detailed analysis
- [ ] Add email report generation for consultations
- [ ] Create SCA mock exam mode with multiple cases

## Phase 11: Admin Panel
- [x] Build admin dashboard with overview metrics
- [x] Implement user management (view, edit, promote to admin, assign trials)
- [x] Create question management CRUD interface
- [ ] Build content management for Note360
- [ ] Implement pattern card management
- [x] Create coupon management interface (AdminCouponManager component)
- [x] Build analytics dashboard (DAU/MAU, MRR, retention cohorts)
- [ ] Implement email/push notification broadcast system
- [ ] Add admin activity logging

## Phase 12: AI Coach360 Assistant
- [x] Design chat interface component with message history (AICoachChat component)
- [ ] Implement persistent conversation storage
- [ ] Build Claude AI integration with user performance context injection
- [ ] Create accessibility from every page (floating chat icon)
- [ ] Implement streaming message support
- [x] Add markdown rendering for AI responses
- [ ] Build conversation history management

## Phase 13: Polish & Optimization
- [x] Implement comprehensive error handling and user feedback (errorHandler.ts)
- [x] Add loading states and skeleton screens (LoadingStates.tsx)
- [ ] Optimize performance (code splitting, lazy loading, image optimization)
- [ ] Implement accessibility features (WCAG 2.1 AA compliance)
- [x] Add comprehensive test coverage with Vitest (features.test.ts)
- [ ] Optimize mobile responsiveness
- [x] Implement analytics tracking (analytics.ts)
- [ ] Add security hardening (CSRF, XSS prevention, rate limiting)
- [ ] Create comprehensive documentation and deployment guide

## Phase 14: Content Seeding & Launch Prep
- [ ] Create seed script for initial admin user
- [ ] Seed sample questions for each exam product
- [ ] Seed Note360 content for key specialties
- [ ] Seed Pattern Recognition cards
- [ ] Seed SCA cases
- [ ] Create App Store assets (screenshots, icons, descriptions)
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain and SSL

## Additional Features (Post-MVP)
- [ ] Implement Spaced Repetition System (SRS) for USMLE/Med Student
- [ ] Build AI Exam Coach with weak area detection
- [ ] Implement Predictive Pass Probability Engine
- [ ] Build Adaptive Question Engine
- [ ] Create Daily Challenge mode
- [ ] Implement Group Study Rooms
- [ ] Build 3D Anatomy Integration
- [ ] Add Offline Mode (PWA + Mobile)
- [ ] Create Video Explanation Library
- [ ] Build Smart Revision Planner
- [ ] Implement Peer Benchmarking
- [ ] Create Community Forum
- [ ] Build Achievement & Gamification System
- [ ] Add Clinical Decision Support Integration
- [ ] Implement Multi-Language Support
- [ ] Add Paystack payment integration for Africa

---

## Notes
- All feature names must be preserved exactly as specified
- Design must be elegant, premium, and refined throughout
- All integrations use pre-configured helpers (no manual API key setup needed)
- Database schema must support Row Level Security (RLS)
- Mobile app development is Phase 2 (not included in initial web build)
