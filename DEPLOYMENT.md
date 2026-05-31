# Question Grove 360 - Deployment Guide

## Overview

Question Grove 360 is a premium medical exam preparation platform built with React 19, Express 4, tRPC 11, and Drizzle ORM. This guide covers deployment, configuration, and production setup.

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are configured in the Management UI (Settings → Secrets):

**Required Secrets:**
- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Session signing secret
- `ANTHROPIC_API_KEY` - Claude AI API key
- `ELEVENLABS_API_KEY` - Voice synthesis API key
- `DEEPGRAM_API_KEY` - Speech-to-text API key
- `RESEND_API_KEY` - Email service API key
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe frontend key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing key

**Optional Secrets:**
- `PAYSTACK_SECRET_KEY` - Paystack payment (Africa)
- `VITE_APP_TITLE` - Custom app title
- `VITE_APP_LOGO` - Custom logo URL

### 2. Database Setup

1. Ensure database is created and accessible
2. Run all migrations:
   ```bash
   pnpm drizzle-kit migrate
   ```
3. Verify all tables are created:
   ```bash
   pnpm drizzle-kit studio
   ```

### 3. Content Seeding

Seed initial data for production:

```bash
# Create admin user
node scripts/seed-admin.mjs

# Seed questions
node scripts/seed-questions.mjs

# Seed Note360 content
node scripts/seed-notes.mjs

# Seed flashcards
node scripts/seed-flashcards.mjs

# Seed SCA cases
node scripts/seed-sca-cases.mjs
```

### 4. Stripe Configuration

1. Create Stripe account at https://stripe.com
2. Get API keys from Stripe Dashboard
3. Configure webhook endpoint: `https://your-domain.com/api/stripe/webhook`
4. Test with card: `4242 4242 4242 4242`

### 5. Email Configuration

Resend is pre-configured for email delivery:
- Transactional emails (password reset, exam reports)
- User notifications
- Admin alerts

## Deployment Steps

### Manus Platform (Recommended)

1. **Save Checkpoint**: Create a final checkpoint before deployment
   ```bash
   # In Management UI, click "Publish" button
   ```

2. **Configure Custom Domain** (Optional):
   - Go to Settings → Domains
   - Add custom domain or use auto-generated `xxx.manus.space`
   - Configure DNS records

3. **Enable SSL**: Automatically enabled for all Manus domains

4. **Monitor Deployment**: Check Dashboard for deployment status

### External Hosting (Railway, Render, Vercel)

If deploying to external platforms:

1. **Build for Production**:
   ```bash
   pnpm build
   ```

2. **Environment Variables**: Set all secrets in hosting platform

3. **Database**: Use managed database service (PlanetScale, Supabase, etc.)

4. **Deploy**:
   ```bash
   # Railway
   railway up

   # Render
   git push

   # Vercel
   vercel deploy --prod
   ```

## Post-Deployment

### 1. Verify Services

- [ ] Landing page loads
- [ ] Authentication works (OAuth + email)
- [ ] Dashboard displays correctly
- [ ] Question Bank functions
- [ ] Mock Exams timer works
- [ ] Stripe payments process
- [ ] Email notifications send
- [ ] Admin panel accessible

### 2. Monitor Performance

- Check server logs for errors
- Monitor database performance
- Track API response times
- Monitor error rates

### 3. Security Hardening

- [ ] Enable HTTPS (auto-enabled on Manus)
- [ ] Configure CORS properly
- [ ] Set security headers
- [ ] Enable rate limiting
- [ ] Regular security audits

### 4. Backup Strategy

- Daily database backups
- Weekly full backups
- Test restore procedures
- Store backups in multiple regions

## Scaling Considerations

### Database Optimization

- Add indexes on frequently queried columns
- Monitor slow queries
- Consider read replicas for analytics
- Archive old exam attempts

### Caching Strategy

- Cache user profiles (5 min TTL)
- Cache question banks (1 hour TTL)
- Cache Note360 content (24 hour TTL)
- Cache analytics data (1 hour TTL)

### Load Balancing

- Use auto-scaling for traffic spikes
- Configure CDN for static assets
- Load balance across multiple instances
- Monitor CPU and memory usage

## Monitoring & Alerts

### Key Metrics to Monitor

- API response time (target: <200ms)
- Error rate (target: <0.1%)
- Database connection pool usage
- Memory usage
- CPU usage
- Disk space

### Alert Thresholds

- Response time > 500ms
- Error rate > 1%
- Database connections > 80%
- Memory usage > 85%
- Disk space < 10%

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify DATABASE_URL is correct
- Check database is running
- Verify firewall rules
- Check connection pool limits

**Stripe Webhook Not Receiving Events**
- Verify webhook endpoint is public
- Check webhook signing secret
- Review Stripe Dashboard logs
- Test with Stripe CLI

**Email Not Sending**
- Verify RESEND_API_KEY is correct
- Check email templates
- Review email logs
- Test with test email address

**Voice Features Not Working**
- Verify DEEPGRAM_API_KEY is valid
- Check browser microphone permissions
- Verify ELEVENLABS_API_KEY is configured
- Test with sample audio

## Maintenance

### Regular Tasks

- Monitor error logs daily
- Review analytics weekly
- Update dependencies monthly
- Security patches as needed
- Database optimization quarterly

### Backup & Recovery

- Test backup restoration monthly
- Document recovery procedures
- Maintain disaster recovery plan
- Regular security audits

## Support & Resources

- **Documentation**: See README.md
- **API Reference**: See server/routers.ts
- **Database Schema**: See drizzle/schema.ts
- **Component Library**: See client/src/components/ui/

## Rollback Procedure

If deployment issues occur:

1. Go to Management UI → Version History
2. Select previous stable version
3. Click "Rollback"
4. Verify services are functioning

## Performance Optimization Tips

1. **Frontend**:
   - Enable code splitting
   - Lazy load routes
   - Optimize images
   - Minify CSS/JS

2. **Backend**:
   - Use database indexes
   - Implement caching
   - Optimize queries
   - Use connection pooling

3. **Infrastructure**:
   - Use CDN for static assets
   - Enable gzip compression
   - Configure caching headers
   - Use HTTP/2

## Compliance & Security

- GDPR compliance for EU users
- HIPAA considerations for medical data
- Regular security audits
- Penetration testing
- Data encryption at rest and in transit

---

**Last Updated**: May 31, 2026
**Version**: 1.0.0
