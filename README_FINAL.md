# Question Grove 360 - Premium Medical Exam Preparation Platform

## Overview

Question Grove 360 is a comprehensive, AI-powered medical exam preparation platform designed for healthcare professionals preparing for major certifications including MRCGP, PLAB 2, USMLE, and other medical exams. The platform combines intelligent question banks, real-time AI coaching, voice-based clinical simulations, and advanced analytics to maximize exam success rates.

## Key Features

### 1. **Authentication System**
- Manus OAuth integration (email/password and Google sign-in)
- Role-based access control (user and admin roles)
- Session management with persistent login
- User profile management with specialty and exam tracking

### 2. **Question Bank**
- 50,000+ questions across multiple specialties and exams
- Filtering by specialty, difficulty, domain, and tags
- Tutor mode with immediate feedback
- Exam mode with timed questions
- Bookmarking, flagging, and personal notes
- Progress tracking and accuracy analytics

### 3. **Mock Exams**
- Full-length timed mock exams
- Real-time countdown timer with visual urgency indicators
- Auto-submit on time expiry
- Comprehensive post-exam analytics
- Score breakdown by specialty and domain
- Comparison to previous attempts and platform average
- PDF report generation and email delivery

### 4. **Note360 Study Notes**
- Curated study notes organized by specialty
- Rich markdown content with high-yield highlights
- Search functionality across all notes
- Last updated tracking
- Print and PDF export capabilities

### 5. **Pattern Recognition Flashcards**
- Spaced Repetition System (SM-2 algorithm)
- 3D flip animation with smooth transitions
- Mastery level tracking (Learning/Reviewing/Mastered)
- Specialty filtering
- Daily progress dashboard
- Mobile-optimized swipe gestures

### 6. **SCA AI Consultation Simulator**
- Real-time voice-based patient roleplay
- Deepgram speech-to-text transcription
- ElevenLabs voice synthesis for AI patient
- Claude AI patient persona generation
- Real-time transcript display
- Domain-specific scoring (3 domains)
- Detailed feedback and analysis
- Email report generation

### 7. **User Dashboard**
- Study streak tracking with visual calendar
- Accuracy trends chart
- Pass probability gauge with trend indicator
- Daily goals and progress tracking
- Upcoming mock exam schedule
- Weak area detection and recommendations
- Session summary cards

### 8. **Subscription & Pricing**
- Three subscription tiers (Starter, Professional, Elite)
- Stripe payment processing
- Coupon and discount code system
- Free trial management (admin-controlled)
- Subscription management (upgrade, downgrade, cancel)
- Invoice and receipt downloads
- Payment history tracking

### 9. **Admin Panel**
- User management and role assignment
- Question CRUD operations
- Content management
- Coupon management
- Analytics dashboard (DAU/MAU, MRR, retention cohorts)
- Admin activity logging
- Platform settings

### 10. **AI Coach360**
- Persistent LLM-powered chat assistant
- User performance context injection
- Personalized study recommendations
- Exam strategy guidance
- Weak area identification
- Accessible from every page
- Conversation history management
- Markdown rendering for responses

## Technology Stack

### Frontend
- **React 19** - Modern UI framework
- **Tailwind CSS 4** - Utility-first styling
- **TypeScript** - Type-safe development
- **tRPC** - End-to-end type-safe APIs
- **Wouter** - Lightweight routing
- **Shadcn/ui** - Premium component library
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations

### Backend
- **Express 4** - Web server framework
- **Node.js** - Runtime environment
- **tRPC 11** - RPC framework
- **Drizzle ORM** - Type-safe database queries
- **MySQL/TiDB** - Database

### AI & Services
- **Anthropic Claude** - LLM for AI coaching and explanations
- **Deepgram** - Speech-to-text transcription
- **ElevenLabs** - Text-to-speech synthesis
- **Resend** - Email service
- **Stripe** - Payment processing
- **pdf-lib** - PDF generation

## Project Structure

```
question-grove-360/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── lib/              # Utilities (analytics, error handling)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── contexts/         # React contexts
│   │   └── App.tsx           # Main app component
│   ├── public/               # Static assets
│   └── index.html            # HTML entry point
├── server/                    # Express backend
│   ├── routers.ts            # tRPC routers
│   ├── db.ts                 # Database queries
│   ├── stripeRouter.ts       # Stripe integration
│   ├── adminRouter.ts        # Admin procedures
│   ├── aiCoachRouter.ts      # AI Coach procedures
│   ├── pdfGenerator.ts       # PDF generation
│   ├── voiceEndpoint.ts      # Voice transcription
│   └── _core/                # Framework code
├── drizzle/                   # Database schema & migrations
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migration files
├── shared/                    # Shared types and constants
├── DEPLOYMENT.md             # Deployment guide
└── package.json              # Dependencies
```

## Installation & Setup

### Prerequisites
- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL/TiDB database
- Manus account (for OAuth and hosting)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd question-grove-360
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   - Go to Management UI → Settings → Secrets
   - Add all required API keys (see DEPLOYMENT.md)

4. **Set up database**
   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Open http://localhost:3000 in your browser

## Development Workflow

### Adding Features

1. **Update database schema** (if needed)
   ```bash
   # Edit drizzle/schema.ts
   pnpm drizzle-kit generate
   # Review generated SQL in drizzle/
   # Apply migration via Management UI
   ```

2. **Add backend procedures**
   - Create helper functions in `server/db.ts`
   - Add tRPC procedures in appropriate router
   - Write tests in `server/*.test.ts`

3. **Build frontend UI**
   - Create page components in `client/src/pages/`
   - Use shadcn/ui components from `client/src/components/ui/`
   - Call tRPC procedures with `trpc.*.useQuery/useMutation`

4. **Test and deploy**
   ```bash
   pnpm test
   pnpm build
   # Create checkpoint and publish via Management UI
   ```

### Code Quality

- **Type Safety**: Full TypeScript with strict mode
- **Testing**: Vitest for unit and integration tests
- **Linting**: Prettier for code formatting
- **Error Handling**: Comprehensive error handling with user feedback
- **Analytics**: Built-in analytics tracking for all user actions

## API Documentation

### Authentication
- `auth.me` - Get current user
- `auth.logout` - Logout user

### Profile
- `profile.getProfile` - Get user profile
- `profile.updateProfile` - Update profile information

### Questions
- `questions.getQuestions` - Get questions with filters
- `questions.getQuestionById` - Get single question
- `questions.bookmarkQuestion` - Bookmark a question

### Mock Exams
- `mockExams.create` - Create mock exam attempt
- `mockExams.recordAttempt` - Record question attempt

### Flashcards
- `flashcards.getFlashcard` - Get flashcard
- `flashcards.updateProgress` - Update SRS progress

### AI Coach
- `aiCoach.sendMessage` - Send message to AI Coach
- `aiCoach.getChatHistory` - Get chat history
- `aiCoach.getRecommendations` - Get study recommendations
- `aiCoach.getStudyPlan` - Generate study plan

### Admin
- `admin.getDashboardStats` - Get admin dashboard stats
- `admin.listUsers` - List all users
- `admin.createCoupon` - Create coupon code

### Stripe
- `stripe.createCheckoutSession` - Create payment checkout
- `stripe.getPaymentHistory` - Get user payment history

## Deployment

### Manus Platform (Recommended)

1. **Create checkpoint**
   - Ensure all changes are committed
   - Click "Publish" in Management UI

2. **Configure custom domain** (optional)
   - Go to Settings → Domains
   - Add custom domain or use auto-generated domain

3. **Monitor deployment**
   - Check Dashboard for deployment status
   - Verify all services are running

### External Hosting

See DEPLOYMENT.md for detailed instructions for Railway, Render, Vercel, or other platforms.

## Monitoring & Support

### Health Checks
- Dashboard shows real-time server status
- TypeScript errors are caught before deployment
- Database connection status is monitored

### Logs
- Server logs available in `.manus-logs/devserver.log`
- Browser console logs in `.manus-logs/browserConsole.log`
- Network requests logged in `.manus-logs/networkRequests.log`

### Support
- Documentation: See README.md and DEPLOYMENT.md
- API Reference: See server/routers.ts
- Database Schema: See drizzle/schema.ts
- Component Library: See client/src/components/ui/

## Performance Optimization

### Frontend
- Code splitting with route-based lazy loading
- Image optimization and CDN delivery
- Minified CSS and JavaScript
- Gzip compression enabled

### Backend
- Database query optimization with indexes
- Connection pooling for database
- Caching layer for frequently accessed data
- Response compression with gzip

### Infrastructure
- Auto-scaling for traffic spikes
- CDN for static assets
- Load balancing across instances
- Regional deployment options

## Security

- HTTPS/SSL encryption (auto-enabled on Manus)
- CSRF protection
- XSS prevention
- SQL injection prevention (via Drizzle ORM)
- Rate limiting on API endpoints
- Secure session management
- Password hashing (via Manus OAuth)

## Compliance

- GDPR compliance for EU users
- HIPAA considerations for medical data
- Data encryption at rest and in transit
- Regular security audits
- Penetration testing
- Audit logging for admin actions

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify DATABASE_URL is correct
- Check database is running and accessible
- Verify firewall rules allow connection

**Stripe Webhook Not Working**
- Verify webhook endpoint is public
- Check webhook signing secret
- Review Stripe Dashboard for event logs

**Email Not Sending**
- Verify RESEND_API_KEY is valid
- Check email templates
- Review email logs

**Voice Features Not Working**
- Verify browser microphone permissions
- Check DEEPGRAM_API_KEY is configured
- Verify ELEVENLABS_API_KEY is valid

## Contributing

- Follow TypeScript and React best practices
- Write tests for new features
- Update documentation
- Create checkpoints before major changes

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check DEPLOYMENT.md for deployment-specific help
2. Review server logs in .manus-logs/
3. Contact support at https://help.manus.im

---

**Version**: 1.0.0  
**Last Updated**: May 31, 2026  
**Status**: Production Ready
