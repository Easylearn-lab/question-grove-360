# Question Grove 360 - API Documentation

## Overview

Question Grove 360 uses tRPC for type-safe API communication. All endpoints are accessible through the `/api/trpc` gateway.

## Authentication

All protected endpoints require a valid session cookie set by the OAuth callback.

```typescript
// Check current user
const user = await trpc.auth.me.useQuery();

// Logout
await trpc.auth.logout.useMutation();
```

## API Endpoints

### Authentication

#### `auth.me`
Get current authenticated user
```typescript
const user = await trpc.auth.me.useQuery();
// Returns: User | null
```

#### `auth.logout`
Logout current user
```typescript
await trpc.auth.logout.useMutation();
// Returns: { success: true }
```

### Profile Management

#### `profile.get`
Get user profile
```typescript
const profile = await trpc.profile.get.useQuery();
// Returns: UserProfile
```

#### `profile.update`
Update user profile
```typescript
await trpc.profile.update.useMutation({
  fullName: "John Doe",
  specialty: "Cardiology",
  trainingYear: 2,
  targetExam: "MRCGP",
  country: "United Kingdom",
  targetExamDate: new Date("2024-12-31"),
});
// Returns: UserProfile
```

### Questions

#### `questions.list`
List questions with filters
```typescript
const questions = await trpc.questions.list.useQuery({
  specialty: "Cardiology",
  difficulty: "Easy",
  domain: "Clinical Knowledge",
  limit: 20,
  offset: 0,
});
// Returns: { questions: Question[], total: number }
```

#### `questions.getById`
Get single question
```typescript
const question = await trpc.questions.getById.useQuery(questionId);
// Returns: Question
```

#### `questions.recordAttempt`
Record user attempt
```typescript
await trpc.questions.recordAttempt.useMutation({
  questionId: 1,
  selectedAnswer: "A",
  mode: "tutor",
  timeSpent: 45,
});
// Returns: { isCorrect: boolean, explanation: string }
```

#### `questions.bookmark`
Bookmark/unbookmark question
```typescript
await trpc.questions.bookmark.useMutation({
  questionId: 1,
  isBookmarked: true,
});
// Returns: { success: boolean }
```

### Mock Exams

#### `mockExams.list`
List mock exams
```typescript
const exams = await trpc.mockExams.list.useQuery();
// Returns: MockExam[]
```

#### `mockExams.create`
Create new mock exam
```typescript
const exam = await trpc.mockExams.create.useMutation({
  name: "Full Length Mock",
  questionIds: [1, 2, 3, ...],
  timeLimit: 180,
});
// Returns: MockExam
```

#### `mockExams.getById`
Get mock exam details
```typescript
const exam = await trpc.mockExams.getById.useQuery(examId);
// Returns: MockExam with questions
```

#### `mockExams.submitResult`
Submit exam results
```typescript
const result = await trpc.mockExams.submitResult.useMutation({
  examId: 1,
  answers: [
    { questionId: 1, selectedAnswer: "A" },
    { questionId: 2, selectedAnswer: "B" },
  ],
});
// Returns: { score: number, passed: boolean, breakdown: {...} }
```

### Flashcards (Pattern Recognition)

#### `flashcards.list`
List flashcards
```typescript
const cards = await trpc.flashcards.list.useQuery({
  specialty: "Cardiology",
  masteryLevel: "Learning",
});
// Returns: Flashcard[]
```

#### `flashcards.create`
Create new flashcard
```typescript
const card = await trpc.flashcards.create.useMutation({
  category: "Cardiology",
  front: "What is the normal heart rate?",
  back: "60-100 bpm",
  tags: ["Heart Rate", "Vital Signs"],
});
// Returns: Flashcard
```

#### `flashcards.updateSRS`
Update SRS progress
```typescript
await trpc.flashcards.updateSRS.useMutation({
  cardId: 1,
  masteryLevel: "Reviewing",
  easeFactor: 2.5,
  interval: 3,
});
// Returns: { success: boolean }
```

### Study Notes (Note360)

#### `notes.list`
List study notes
```typescript
const notes = await trpc.notes.list.useQuery({
  specialty: "Cardiology",
});
// Returns: Note[]
```

#### `notes.getById`
Get note details
```typescript
const note = await trpc.notes.getById.useQuery(noteId);
// Returns: Note with markdown content
```

#### `notes.create`
Create new note
```typescript
const note = await trpc.notes.create.useMutation({
  title: "Cardiac Physiology",
  specialty: "Cardiology",
  content: "# Cardiac Physiology\n\n...",
  isHighYield: true,
});
// Returns: Note
```

### AI Coach360

#### `aiCoach.sendMessage`
Send message to AI Coach
```typescript
const response = await trpc.aiCoach.sendMessage.useMutation({
  message: "I'm struggling with cardiology",
  context: {
    recentAccuracy: 0.65,
    weakAreas: ["Arrhythmias"],
  },
});
// Returns: { message: string, recommendations: string[] }
```

#### `aiCoach.getHistory`
Get chat history
```typescript
const history = await trpc.aiCoach.getHistory.useQuery();
// Returns: ChatMessage[]
```

### Payments (Stripe)

#### `payments.createCheckout`
Create Stripe checkout session
```typescript
const { url } = await trpc.payments.createCheckout.useMutation({
  planId: "professional",
  couponCode: "LAUNCH20",
});
// Returns: { url: string }
```

#### `payments.getSubscription`
Get current subscription
```typescript
const subscription = await trpc.payments.getSubscription.useQuery();
// Returns: Subscription | null
```

#### `payments.cancelSubscription`
Cancel subscription
```typescript
await trpc.payments.cancelSubscription.useMutation();
// Returns: { success: boolean }
```

### Admin

#### `admin.getUsers`
List all users (admin only)
```typescript
const users = await trpc.admin.getUsers.useQuery({
  limit: 50,
  offset: 0,
});
// Returns: { users: User[], total: number }
```

#### `admin.updateUserRole`
Update user role (admin only)
```typescript
await trpc.admin.updateUserRole.useMutation({
  userId: 1,
  role: "admin",
});
// Returns: { success: boolean }
```

#### `admin.createCoupon`
Create coupon (admin only)
```typescript
const coupon = await trpc.admin.createCoupon.useMutation({
  code: "LAUNCH20",
  discountType: "percentage",
  discountValue: 20,
  maxUsageCount: 100,
});
// Returns: Coupon
```

#### `admin.getAnalytics`
Get platform analytics (admin only)
```typescript
const analytics = await trpc.admin.getAnalytics.useQuery();
// Returns: { dau: number, mau: number, mrr: number, ... }
```

## Error Handling

All errors are returned with appropriate HTTP status codes and error messages:

```typescript
try {
  await trpc.questions.recordAttempt.useMutation({...});
} catch (error) {
  if (error.code === "UNAUTHORIZED") {
    // User not authenticated
  } else if (error.code === "FORBIDDEN") {
    // User not authorized
  } else if (error.code === "NOT_FOUND") {
    // Resource not found
  } else {
    // Other error
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication**: 10 requests per minute
- **Questions**: 100 requests per minute
- **Payments**: 5 requests per minute
- **Admin**: 50 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Webhooks

### Stripe Webhook
Endpoint: `/api/stripe/webhook`

Events:
- `checkout.session.completed` - Payment successful
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled

## Best Practices

1. **Always handle errors** - Use try/catch or error callbacks
2. **Implement loading states** - Show spinners during requests
3. **Use optimistic updates** - Update UI before confirmation
4. **Cache responses** - Reduce unnecessary API calls
5. **Validate input** - Check data before sending
6. **Monitor performance** - Track API response times
7. **Log errors** - Send errors to monitoring service

## Example Usage

```typescript
import { trpc } from "@/lib/trpc";

export function QuestionComponent() {
  const { data: questions, isLoading } = trpc.questions.list.useQuery({
    specialty: "Cardiology",
  });

  const recordAttempt = trpc.questions.recordAttempt.useMutation({
    onSuccess: (result) => {
      console.log("Answer recorded:", result);
    },
    onError: (error) => {
      console.error("Failed to record answer:", error);
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {questions?.map((q) => (
        <div key={q.id}>
          <h3>{q.question}</h3>
          <button
            onClick={() =>
              recordAttempt.mutate({
                questionId: q.id,
                selectedAnswer: "A",
                mode: "tutor",
                timeSpent: 45,
              })
            }
          >
            Submit Answer
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Support

For API issues or questions, contact: api-support@questiongrove360.com
