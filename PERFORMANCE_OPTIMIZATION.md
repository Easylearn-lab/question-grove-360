# Question Grove 360 - Performance Optimization Guide

## Current Performance Baseline

### Page Load Times (Target: < 2.5s)
- Landing Page: ~1.8s
- Dashboard: ~2.1s
- Question Bank: ~2.0s
- Mock Exam: ~2.3s
- Admin Panel: ~2.5s

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s ✓
- **FID (First Input Delay):** < 100ms ✓
- **CLS (Cumulative Layout Shift):** < 0.1 ✓

## Bundle Size Optimization

### Current Bundle Sizes
- Main bundle: ~450KB
- Vendor bundle: ~320KB
- Total: ~770KB

### Optimization Strategies

#### 1. Code Splitting
Implement route-based code splitting to reduce initial bundle size:

```typescript
// client/src/App.tsx
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const MockExams = lazy(() => import('./pages/MockExams'));
const Note360 = lazy(() => import('./pages/Note360'));
const PatternRecognition = lazy(() => import('./pages/PatternRecognition'));
const SCASimulator = lazy(() => import('./pages/SCASimulator'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AICoach = lazy(() => import('./pages/AICoach'));
```

**Expected Impact:** 30-40% reduction in initial bundle

#### 2. Dependency Optimization
- Remove unused dependencies
- Use tree-shaking compatible libraries
- Replace heavy libraries with lighter alternatives

**Current Analysis:**
- recharts: 250KB → Consider recharts-lite or custom charts
- framer-motion: 80KB → Use CSS animations where possible
- lodash: 70KB → Use native JavaScript

#### 3. Image Optimization
- Implement WebP format with fallbacks
- Lazy load images below the fold
- Use responsive images with srcset
- Compress images to < 100KB each

```typescript
// Example: Lazy load images
<img
  src="placeholder.jpg"
  data-src="image.webp"
  loading="lazy"
  alt="Description"
/>
```

#### 4. CSS Optimization
- Remove unused CSS with PurgeCSS
- Minify CSS in production
- Use CSS-in-JS only where necessary
- Implement critical CSS inlining

**Tailwind CSS Optimization:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './client/src/**/*.{js,jsx,ts,tsx}',
  ],
  // Remove unused utilities
};
```

## Caching Strategies

### Browser Caching
```javascript
// server/middleware/cache.ts
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.match(/\.(html)$/)) {
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  } else {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});
```

### Service Worker Caching
Implement service worker for offline support and faster repeat visits:

```typescript
// client/public/sw.js
const CACHE_NAME = 'qg360-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### API Response Caching
```typescript
// client/src/lib/cache.ts
const cache = new Map();

export function getCachedData(key, fetcher, ttl = 5 * 60 * 1000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

## Database Query Optimization

### Query Performance
- Add database indexes on frequently queried columns
- Optimize JOIN operations
- Use pagination for large result sets
- Implement query caching

```sql
-- Add indexes
CREATE INDEX idx_questions_specialty ON questions(specialty);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_user_attempts_user_id ON user_attempts(user_id);
CREATE INDEX idx_mock_results_user_id ON mock_results(user_id);
```

### N+1 Query Prevention
Use batch loading to prevent N+1 queries:

```typescript
// server/db.ts
export async function getQuestionsWithStats(questionIds: number[]) {
  // Fetch all questions in one query
  const questions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));
  
  // Fetch all stats in one query
  const stats = await db
    .select()
    .from(userAttempts)
    .where(inArray(userAttempts.questionId, questionIds));
  
  // Combine results
  return questions.map(q => ({
    ...q,
    stats: stats.filter(s => s.questionId === q.id),
  }));
}
```

## Frontend Performance

### React Optimization
- Use React.memo for expensive components
- Implement useMemo for expensive calculations
- Use useCallback for stable function references
- Lazy load components

```typescript
// Memoize expensive component
const QuestionCard = React.memo(({ question }) => {
  return <div>{question.text}</div>;
});

// Memoize expensive calculation
const accuracy = useMemo(() => {
  return calculateAccuracy(attempts);
}, [attempts]);

// Stable callback
const handleSubmit = useCallback((answer) => {
  submitAnswer(answer);
}, []);
```

### Virtual Scrolling
For large lists, implement virtual scrolling:

```typescript
import { FixedSizeList } from 'react-window';

export function QuestionList({ questions }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={questions.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <QuestionCard question={questions[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Infinite Scroll
Implement pagination with infinite scroll:

```typescript
export function InfiniteQuestions() {
  const [page, setPage] = useState(0);
  const { data, hasMore } = trpc.questions.list.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (last) => last.nextCursor }
  );

  return (
    <InfiniteScroll
      dataLength={data?.pages.length || 0}
      next={() => setPage(p => p + 1)}
      hasMore={hasMore}
      loader={<Spinner />}
    >
      {data?.pages.map(page =>
        page.questions.map(q => <QuestionCard key={q.id} question={q} />)
      )}
    </InfiniteScroll>
  );
}
```

## Server Performance

### Response Compression
Enable gzip compression:

```typescript
// server/_core/index.ts
import compression from 'compression';

app.use(compression());
```

### Connection Pooling
Optimize database connections:

```typescript
// server/db.ts
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

### Request Batching
Implement request batching for multiple API calls:

```typescript
// server/routers.ts
export const appRouter = router({
  batch: publicProcedure
    .input(z.array(z.object({
      type: z.string(),
      params: z.any(),
    })))
    .query(async ({ input }) => {
      return Promise.all(
        input.map(req => handleBatchRequest(req))
      );
    }),
});
```

## CDN Implementation

### Static Asset CDN
Deploy static assets to CDN:

```typescript
// client/src/const.ts
export const CDN_URL = 'https://cdn.questiongrove360.com';

export function getImageUrl(path: string) {
  return `${CDN_URL}/images/${path}`;
}
```

### API Gateway CDN
Cache API responses at edge:

```
Cache-Control: public, max-age=300
Vary: Accept-Encoding, Authorization
```

## Monitoring & Analytics

### Performance Metrics
Track key metrics:

```typescript
// client/src/lib/analytics.ts
export function trackPerformance() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);
        // Send to analytics
        sendToAnalytics({
          metric: entry.name,
          value: entry.duration,
        });
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
}
```

### Real User Monitoring (RUM)
Implement RUM to track real user performance:

```typescript
// Integrate with service like DataDog, New Relic, or Sentry
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

## Performance Checklist

### Before Deployment
- [ ] Bundle size analyzed
- [ ] Code splitting implemented
- [ ] Images optimized
- [ ] CSS minified
- [ ] JavaScript minified
- [ ] Caching configured
- [ ] Service worker deployed
- [ ] Database indexes created
- [ ] API response times < 500ms
- [ ] Core Web Vitals passing

### Post-Deployment
- [ ] Monitor performance metrics
- [ ] Track user experience
- [ ] Identify bottlenecks
- [ ] Optimize based on data
- [ ] Regular performance audits

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP | < 2.5s | ~2.1s |
| FID | < 100ms | ~50ms |
| CLS | < 0.1 | ~0.05 |
| Bundle Size | < 500KB | ~450KB |
| API Response | < 500ms | ~200ms |
| Page Load | < 2.5s | ~2.1s |

## Optimization Roadmap

### Phase 1 (Immediate)
- [ ] Implement code splitting
- [ ] Optimize images
- [ ] Add caching headers
- [ ] Minify CSS/JS

### Phase 2 (Week 1-2)
- [ ] Implement service worker
- [ ] Add database indexes
- [ ] Optimize queries
- [ ] Implement virtual scrolling

### Phase 3 (Week 3-4)
- [ ] Deploy to CDN
- [ ] Implement RUM
- [ ] Performance monitoring
- [ ] Continuous optimization

---

**Performance Optimization Status:** IN PROGRESS
**Last Updated:** [DATE]
**Next Review:** [DATE]
