# Question Grove 360 - Admin Guide

## Admin Panel Overview

The Admin Panel provides comprehensive tools for managing the platform, users, content, and analytics.

## Access Control

Only users with the "admin" role can access the Admin Panel. To promote a user to admin:

1. Go to Admin Panel → User Management
2. Find the user
3. Click "Promote to Admin"
4. Confirm action

## User Management

### Viewing Users

Navigate to Admin Panel → Users to see all registered users with:
- User ID and email
- Registration date
- Last login
- Subscription status
- Account status (active/inactive)

### Managing Individual Users

Click on any user to:
- View profile information
- Check subscription status
- View study statistics
- Assign free trial
- Promote/demote admin status
- Suspend/activate account

### User Actions

**Assign Free Trial**
- Select user
- Click "Assign Trial"
- Choose trial duration (7, 14, or 30 days)
- Trial activated immediately

**Promote to Admin**
- Select user
- Click "Promote to Admin"
- Confirm action
- User gains admin access

**Suspend Account**
- Select user
- Click "Suspend"
- Choose reason
- User cannot access platform

## Content Management

### Question Management

Navigate to Admin Panel → Questions to:

**Add New Question**
1. Click "Add Question"
2. Fill in question details:
   - Question text
   - Question type (MCQ, True/False, etc.)
   - Specialty
   - Difficulty
   - Domain
   - Options/Answers
   - Explanation
3. Click "Save"

**Edit Question**
1. Find question in list
2. Click "Edit"
3. Modify details
4. Click "Save"

**Delete Question**
1. Find question
2. Click "Delete"
3. Confirm deletion
4. Question removed from platform

**Bulk Upload**
1. Prepare CSV file with questions
2. Click "Bulk Upload"
3. Select file
4. Review preview
5. Click "Upload"

### Note360 Management

Navigate to Admin Panel → Notes to:

**Add Study Notes**
1. Click "Add Note"
2. Enter title and specialty
3. Write content in markdown
4. Mark high-yield sections
5. Click "Save"

**Edit Notes**
1. Find note in list
2. Click "Edit"
3. Modify content
4. Click "Save"

**Organize by Specialty**
- Notes automatically organized
- View by specialty
- Filter by completion status

### Flashcard Management

Navigate to Admin Panel → Flashcards to:

**Create Flashcards**
1. Click "Add Card"
2. Enter front and back
3. Select category
4. Add tags
5. Click "Save"

**Bulk Create**
1. Prepare CSV with cards
2. Click "Bulk Upload"
3. Review and confirm
4. Cards created

## Coupon Management

Navigate to Admin Panel → Coupons to manage discount codes.

### Creating Coupons

**New Coupon**
1. Click "Create Coupon"
2. Enter coupon code
3. Select discount type:
   - Percentage (e.g., 20%)
   - Fixed amount (e.g., $5)
4. Set maximum usage count
5. Set expiry date
6. Click "Create"

**Coupon Details**
- Code: Unique identifier
- Discount: Amount or percentage
- Max Uses: Total usage limit
- Used: Current usage count
- Expires: Expiry date
- Status: Active/Inactive

### Managing Coupons

**Activate/Deactivate**
- Click toggle to enable/disable
- Inactive coupons cannot be used

**View Usage**
- See how many times used
- View users who used it
- Track redemption rate

**Delete Coupon**
- Click "Delete"
- Confirm action
- Coupon removed

## Analytics Dashboard

Navigate to Admin Panel → Analytics to view platform metrics.

### Key Metrics

**User Metrics**
- Total users
- New users (today/week/month)
- Active users (DAU/MAU)
- Retention rate
- Churn rate

**Engagement Metrics**
- Questions answered
- Mock exams taken
- Average study time
- Feature usage
- Completion rates

**Revenue Metrics**
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (CLV)
- Churn rate

**Subscription Metrics**
- Active subscriptions by plan
- Trial conversions
- Upgrade/downgrade rates
- Cancellation reasons

### Analytics Charts

**User Growth**
- Line chart showing user growth over time
- Compare different periods
- Forecast trends

**Revenue Trends**
- Monthly revenue chart
- Subscription breakdown
- Payment method analysis

**Engagement Heatmap**
- Feature usage by hour/day
- Peak usage times
- User activity patterns

**Retention Cohorts**
- Cohort analysis by signup date
- Retention over time
- Identify churn patterns

## Platform Settings

Navigate to Admin Panel → Settings to configure platform options.

### General Settings

**Platform Name**
- Change platform name
- Update logo
- Set favicon

**Email Configuration**
- Configure sender email
- Set email templates
- Test email delivery

**Payment Settings**
- Stripe API keys
- Webhook configuration
- Tax settings
- Currency selection

### Feature Toggles

Enable/disable features:
- Question Bank
- Mock Exams
- Note360
- Pattern Recognition
- SCA Simulator
- AI Coach360
- Payments

### Notification Settings

Configure notifications:
- Email notifications
- In-app notifications
- Notification frequency
- Notification templates

## Monitoring & Maintenance

### System Health

**Check Status**
- Navigate to Admin Panel → System
- View server status
- Check database health
- Monitor API performance

**Performance Metrics**
- Page load times
- API response times
- Error rates
- Uptime percentage

### Logs & Debugging

**View Logs**
- Application logs
- Error logs
- User activity logs
- Payment logs

**Export Logs**
- Download logs as CSV
- Filter by date range
- Search specific events

## Backup & Recovery

### Automated Backups

Backups run automatically:
- Daily at 2 AM UTC
- Weekly full backups
- Monthly archive backups
- 30-day retention

### Manual Backup

1. Go to Admin Panel → Backup
2. Click "Create Backup"
3. Select backup type
4. Confirm
5. Backup created

### Restore from Backup

1. Go to Admin Panel → Backup
2. Select backup to restore
3. Review details
4. Click "Restore"
5. System restored

## Security Management

### User Permissions

**Role-Based Access**
- Admin: Full access
- Moderator: Content management (coming soon)
- User: Personal features only

### API Keys

**Manage API Keys**
1. Go to Settings → API Keys
2. View active keys
3. Create new key
4. Revoke old keys
5. Rotate keys regularly

### Audit Log

**View Audit Trail**
- All admin actions logged
- User activity tracking
- Payment history
- System changes

## Troubleshooting

### Common Issues

**Users Can't Log In**
- Check OAuth configuration
- Verify API keys
- Review error logs
- Contact support

**Questions Not Showing**
- Verify questions uploaded
- Check specialty filter
- Review question status
- Check database connection

**Payment Issues**
- Verify Stripe keys
- Check webhook configuration
- Review payment logs
- Contact Stripe support

**Performance Issues**
- Check database queries
- Monitor server resources
- Review error logs
- Implement caching

## Best Practices

### Daily Tasks
- Monitor error logs
- Check system health
- Review user feedback
- Monitor payment processing

### Weekly Tasks
- Review analytics
- Check backup status
- Update content
- Review security logs

### Monthly Tasks
- Analyze user trends
- Review financial metrics
- Plan feature updates
- Security audit

### Quarterly Tasks
- Strategic planning
- Performance optimization
- Infrastructure review
- Compliance audit

## Support & Escalation

### Getting Help
- Email: admin-support@questiongrove360.com
- Phone: +1-800-GROVE-ADMIN
- Slack: #admin-support (internal)

### Escalation Process
1. Document issue
2. Gather relevant logs
3. Contact support team
4. Provide reproduction steps
5. Follow up on resolution

## Emergency Procedures

### System Down
1. Check system status page
2. Review error logs
3. Restart services if needed
4. Notify users
5. Document incident

### Data Loss
1. Restore from backup
2. Verify data integrity
3. Notify affected users
4. Document incident
5. Implement prevention measures

### Security Breach
1. Isolate affected systems
2. Revoke compromised keys
3. Notify users
4. Contact security team
5. Conduct investigation

---

**For additional support, contact the platform team at admin-support@questiongrove360.com**
