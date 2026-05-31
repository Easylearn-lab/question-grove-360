# Question Grove 360 - Operations Guide

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compilation clean (`pnpm check`)
- [ ] Build successful (`pnpm build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Stripe keys configured (test mode)
- [ ] API keys configured (Anthropic, ElevenLabs, Deepgram, Resend)
- [ ] Seed data loaded (`npx tsx server/seed.ts`)

### Deployment Steps

1. **Create Checkpoint**
   ```bash
   # Save current state before deployment
   git add .
   git commit -m "Pre-deployment checkpoint"
   ```

2. **Run Tests**
   ```bash
   pnpm test
   pnpm run check
   ```

3. **Build Application**
   ```bash
   pnpm build
   ```

4. **Deploy to Manus**
   - Click "Publish" button in Management UI
   - Or use Manus CLI: `manus deploy`

5. **Verify Deployment**
   - Check live URL
   - Test critical flows
   - Monitor error logs

### Post-Deployment

1. **Monitor Metrics**
   - Check analytics dashboard
   - Monitor error rates
   - Track user activity

2. **Verify Features**
   - Test authentication
   - Verify question loading
   - Test payment flow
   - Check AI Coach responses

3. **Configure Domain**
   - Go to Settings → Domains
   - Add custom domain
   - Configure SSL certificate

4. **Set Up Notifications**
   - Configure email alerts
   - Set up error notifications
   - Enable analytics tracking

## Maintenance

### Daily Tasks
- Monitor error logs
- Check system health
- Review user feedback

### Weekly Tasks
- Review analytics
- Check database performance
- Verify backups

### Monthly Tasks
- Update dependencies
- Security audit
- Performance optimization
- User engagement review

## Troubleshooting

### Common Issues

**Database Connection Error**
```
Error: Cannot read properties of undefined (reading '_config')
```
Solution: Ensure DATABASE_URL is set and database is running

**OAuth Issues**
```
Error: Invalid OAuth credentials
```
Solution: Verify OAUTH_SERVER_URL and VITE_APP_ID are correct

**Stripe Payment Failures**
```
Error: Invalid API key
```
Solution: Verify STRIPE_SECRET_KEY in Settings → Payment

**Voice Integration Issues**
```
Error: Deepgram transcription failed
```
Solution: Check DEEPGRAM_API_KEY and audio file format

### Performance Issues

**Slow Question Loading**
- Check database indexes
- Optimize query filters
- Implement caching

**High Memory Usage**
- Monitor user sessions
- Clear old chat history
- Optimize image sizes

**API Rate Limiting**
- Implement request queuing
- Add exponential backoff
- Contact API providers for higher limits

## Scaling

### Horizontal Scaling
1. Deploy multiple instances
2. Set up load balancer
3. Configure session storage (Redis)
4. Use CDN for static assets

### Database Scaling
1. Enable read replicas
2. Implement query caching
3. Archive old data
4. Optimize indexes

### API Scaling
1. Implement rate limiting
2. Add request queuing
3. Use API gateway
4. Monitor API usage

## Security

### Regular Security Checks
- [ ] Update dependencies monthly
- [ ] Run security audit (`npm audit`)
- [ ] Review access logs
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify HTTPS/SSL configuration
- [ ] Review CORS settings
- [ ] Check rate limiting

### Data Protection
- [ ] Enable database encryption
- [ ] Use HTTPS for all communications
- [ ] Implement API key rotation
- [ ] Secure sensitive data in environment variables
- [ ] Enable audit logging
- [ ] Regular backups

### User Data
- [ ] GDPR compliance
- [ ] Data retention policies
- [ ] User data export functionality
- [ ] Account deletion process
- [ ] Privacy policy updates

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Weekly full backups
- Monthly archive backups
- Test restore procedures monthly

### Recovery Process
1. Identify backup point
2. Stop application
3. Restore database
4. Verify data integrity
5. Restart application

## Monitoring

### Key Metrics
- Page load time
- API response time
- Error rate
- User engagement
- Conversion rate
- Revenue

### Alerts
- High error rate (> 5%)
- Slow API response (> 2s)
- Database connection issues
- Payment processing failures
- Low disk space

### Logging
- Application logs: `/home/ubuntu/question-grove-360/.manus-logs/`
- Error tracking: Integrate with Sentry
- Performance monitoring: Use New Relic or similar

## Rollback Procedure

If deployment causes issues:

1. **Immediate Rollback**
   ```bash
   # Use webdev_rollback_checkpoint to restore previous version
   ```

2. **Verify Rollback**
   - Check live URL
   - Test critical flows
   - Monitor error logs

3. **Post-Mortem**
   - Identify root cause
   - Fix issues
   - Add tests to prevent recurrence
   - Document lessons learned

## Contact & Support

- **Platform Support**: https://help.manus.im
- **Documentation**: See README_FINAL.md
- **Issues**: GitHub Issues
- **Security**: security@questiongrove360.com
