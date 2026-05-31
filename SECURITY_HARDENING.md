# Question Grove 360 - Security Hardening Guide

## Security Overview

This guide covers security best practices, vulnerability prevention, and compliance requirements for Question Grove 360.

## Authentication Security

### OAuth Implementation
- OAuth 2.0 with PKCE flow
- Secure token storage (httpOnly cookies)
- Token refresh mechanism
- Session timeout (24 hours)

```typescript
// server/_core/oauth.ts
export async function handleOAuthCallback(code: string, state: string) {
  // Verify state to prevent CSRF
  const storedState = getStoredState(state);
  if (!storedState || storedState !== state) {
    throw new Error('Invalid state parameter');
  }

  // Exchange code for token
  const token = await exchangeCodeForToken(code);
  
  // Verify token signature
  const payload = verifyToken(token);
  
  // Create session
  return createSession(payload);
}
```

### Password Security
- Minimum 12 characters
- Require uppercase, lowercase, numbers, symbols
- Hash with bcrypt (rounds: 12)
- Implement rate limiting on login

```typescript
// server/auth.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

### Session Security
- Secure, httpOnly, sameSite cookies
- Session timeout after 24 hours
- Automatic logout on suspicious activity
- Device fingerprinting

```typescript
// server/_core/cookies.ts
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};
```

## Input Validation & Sanitization

### Server-Side Validation
Always validate input on the server:

```typescript
// server/routers.ts
import { z } from 'zod';

const questionSchema = z.object({
  question: z.string().min(10).max(1000),
  specialty: z.enum(['Cardiology', 'Respiratory', ...]),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  options: z.array(z.string()).min(2).max(5),
});

export const appRouter = router({
  questions: router({
    create: adminProcedure
      .input(questionSchema)
      .mutation(async ({ input }) => {
        // Input already validated by Zod
        return createQuestion(input);
      }),
  }),
});
```

### XSS Prevention
- Escape HTML output
- Use Content Security Policy (CSP)
- Sanitize user input
- Use React's built-in XSS protection

```typescript
// server/_core/middleware.ts
app.use((req, res, next) => {
  // Set CSP headers
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

### SQL Injection Prevention
Use parameterized queries (Drizzle ORM handles this):

```typescript
// ✓ Safe - Drizzle handles parameterization
const questions = await db
  .select()
  .from(questions)
  .where(eq(questions.specialty, userInput));

// ✗ Unsafe - Never concatenate user input
const query = `SELECT * FROM questions WHERE specialty = '${userInput}'`;
```

## API Security

### Rate Limiting
Implement rate limiting to prevent abuse:

```typescript
// server/middleware/security.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (err) {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### CSRF Protection
Implement CSRF tokens:

```typescript
// server/middleware/csrf.ts
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.post('/api/trpc/*', csrfProtection, (req, res, next) => {
  // CSRF token verified
  next();
});
```

### API Key Security
- Rotate API keys regularly
- Use environment variables
- Implement key versioning
- Monitor key usage

```typescript
// server/_core/env.ts
export const ENV = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  // Never log or expose these
} as const;
```

## Data Protection

### Encryption
- Encrypt sensitive data at rest
- Use TLS 1.3 for transit
- Implement field-level encryption for PII

```typescript
// server/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

export function encryptData(data: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptData(encrypted: string) {
  const [iv, authTag, data] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Data Minimization
- Only collect necessary data
- Delete data after retention period
- Implement data anonymization
- Provide data export functionality

### PII Handling
- Never log PII
- Encrypt PII in database
- Restrict PII access
- Audit PII access

## Authentication & Authorization

### Role-Based Access Control (RBAC)
```typescript
// server/_core/trpc.ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Permission Checking
```typescript
// server/routers.ts
export const appRouter = router({
  admin: router({
    getUsers: adminProcedure.query(async ({ ctx }) => {
      // Only admins can access
      return getUsers();
    }),
  }),
});
```

## Dependency Security

### Vulnerability Scanning
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Use Snyk for continuous monitoring
npx snyk test
```

### Dependency Updates
- Update dependencies monthly
- Review breaking changes
- Test after updates
- Use dependabot for automation

### Trusted Dependencies
- Use verified npm packages
- Check package popularity
- Review package source code
- Monitor for compromised packages

## Infrastructure Security

### HTTPS/TLS
- Enforce HTTPS
- Use TLS 1.3
- Implement HSTS headers
- Regular certificate renewal

```typescript
// server/_core/index.ts
app.use((req, res, next) => {
  // Enforce HTTPS
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  
  // HSTS header
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
});
```

### Security Headers
```typescript
// server/middleware/headers.ts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

### Database Security
- Use strong passwords
- Implement IP whitelisting
- Enable encryption at rest
- Regular backups
- Access control

## Monitoring & Logging

### Security Logging
```typescript
// server/logging.ts
export function logSecurityEvent(event: {
  type: 'LOGIN' | 'FAILED_LOGIN' | 'UNAUTHORIZED_ACCESS' | 'DATA_ACCESS';
  userId?: number;
  ip: string;
  timestamp: Date;
  details?: any;
}) {
  console.log('[SECURITY]', JSON.stringify(event));
  // Send to security monitoring service
}
```

### Intrusion Detection
- Monitor for suspicious patterns
- Alert on multiple failed logins
- Track unusual API usage
- Monitor database access

### Audit Logging
- Log all admin actions
- Log data access
- Log configuration changes
- Maintain audit trail

## Compliance

### GDPR Compliance
- [ ] Privacy policy
- [ ] Consent management
- [ ] Data export functionality
- [ ] Right to be forgotten
- [ ] Data processing agreements

### HIPAA Compliance (if handling health data)
- [ ] Encryption at rest and in transit
- [ ] Access controls
- [ ] Audit logging
- [ ] Business associate agreements
- [ ] Breach notification procedures

### PCI DSS Compliance (for payments)
- [ ] Never store full card numbers
- [ ] Use PCI-compliant payment processor
- [ ] Implement tokenization
- [ ] Regular security testing
- [ ] Maintain audit logs

## Incident Response

### Breach Response Plan
1. Identify the breach
2. Contain the breach
3. Notify affected users
4. Investigate root cause
5. Implement fixes
6. Document lessons learned

### Security Incident Contacts
- Security Team: security@questiongrove360.com
- Incident Response: +1-800-SECURITY
- Legal: legal@questiongrove360.com

## Security Checklist

### Before Deployment
- [ ] All inputs validated
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Sensitive data encrypted
- [ ] Dependencies audited
- [ ] Security tests passing

### Post-Deployment
- [ ] Monitor security logs
- [ ] Track failed logins
- [ ] Monitor API usage
- [ ] Check for vulnerabilities
- [ ] Review access logs
- [ ] Update security policies
- [ ] Conduct security audit
- [ ] Test incident response

### Monthly
- [ ] Update dependencies
- [ ] Run security audit
- [ ] Review access logs
- [ ] Test disaster recovery
- [ ] Update security documentation

### Quarterly
- [ ] Penetration testing
- [ ] Security training
- [ ] Policy review
- [ ] Compliance audit
- [ ] Incident response drill

## Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Top 25: https://cwe.mitre.org/top25/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- Security.txt: https://securitytxt.org/

---

**Security Status:** IMPLEMENTED
**Last Audit:** [DATE]
**Next Audit:** [DATE]
