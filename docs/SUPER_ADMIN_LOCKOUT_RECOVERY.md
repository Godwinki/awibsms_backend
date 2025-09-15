# Super Admin Account Lockout Recovery Guide

## Overview

This document outlines the comprehensive solutions implemented for handling super admin account lockouts in the AWIB SACCOS  Management System. When a super admin account gets locked, it creates a critical security situation that requires special handling.

## 🚨 Emergency Scenarios

### Scenario 1: Single Super Admin Account Locked
- **Risk Level**: CRITICAL
- **Impact**: Complete loss of administrative access
- **Solution**: Emergency unlock script + Database recovery

### Scenario 2: Multiple Super Admins, Some Locked
- **Risk Level**: WARNING to CRITICAL (depending on remaining active admins)
- **Impact**: Reduced administrative capacity
- **Solution**: Super admin mutual unlock system

### Scenario 3: All Super Admin Accounts Locked
- **Risk Level**: CRITICAL
- **Impact**: Complete system lockout
- **Solution**: Emergency script + Manual database intervention

## 🛠️ Available Solutions

### 1. Emergency Super Admin Unlock Script

**Location**: `/backend/scripts/emergency-unlock-super-admin.js`

**Usage**:
```bash
# Navigate to backend directory
cd /path/to/awibsms/backend

# Run the emergency unlock script
node scripts/emergency-unlock-super-admin.js admin@awib-saccos.com

# Or run without email parameter for interactive mode
node scripts/emergency-unlock-super-admin.js
```

**Features**:
- Direct database access (bypasses all middleware)
- Comprehensive audit logging
- Forces password change on next login
- Enables 2FA for security
- Requires detailed reason for unlock
- Server-side validation and confirmation

**When to Use**:
- When all super admins are locked
- Emergency situations requiring immediate access
- When the web interface is unavailable

### 2. Super Admin Management Script

**Location**: `/backend/scripts/manage-super-admins.js`

**Usage**:
```bash
# Check super admin security status
node scripts/manage-super-admins.js check

# List all super admin accounts
node scripts/manage-super-admins.js list

# Create new super admin account
node scripts/manage-super-admins.js create

# Promote existing user to super admin
node scripts/manage-super-admins.js promote
```

**Features**:
- Security status assessment
- Multiple super admin management
- Account creation and promotion
- Preventive measures for lockout scenarios

**When to Use**:
- Proactive super admin management
- Creating backup super admin accounts
- Regular security audits

### 3. Web-Based Super Admin Unlock System

**Location**: `/frontend/src/app/dashboard/super-admin/page.tsx`

**Access**: Dashboard → Super Admin Management (super_admin role only)

**Features**:
- Real-time security status monitoring
- Unlock other super admin accounts
- Audit trail for all actions
- Risk assessment dashboard

**API Endpoints**:
- `GET /api/v1/auth/super-admin/security-status` - Check security status
- `GET /api/v1/auth/super-admin/locked` - List locked super admins
- `POST /api/v1/auth/super-admin/unlock` - Unlock another super admin

**When to Use**:
- When at least one super admin is active
- Regular monitoring and management
- Controlled unlock operations with audit trails

## 🔐 Security Measures

### Preventive Measures

1. **Multiple Super Admin Accounts**
   - Maintain at least 2-3 super admin accounts
   - Use the management script to check: `node scripts/manage-super-admins.js check`

2. **Regular Monitoring**
   - Check super admin status weekly
   - Monitor failed login attempts
   - Review audit logs regularly

3. **Backup Access Methods**
   - Ensure multiple people have server access
   - Document emergency procedures
   - Test recovery procedures periodically

### Security Features During Unlock

1. **Comprehensive Audit Logging**
   - All unlock operations are logged
   - Includes who performed the unlock
   - Detailed reasons and timestamps
   - IP address and user agent tracking

2. **Forced Security Updates**
   - Password change required on next login
   - 2FA automatically enabled
   - Account lockout fields reset

3. **Validation and Confirmation**
   - Multiple confirmation steps
   - Detailed reason requirements (minimum 10 characters)
   - Role-based access controls

## 📋 Step-by-Step Recovery Procedures

### For Single Super Admin Lockout

1. **Immediate Response**:
   ```bash
   # Access the server directly
   ssh user@server
   cd /path/to/awibsms/backend
   
   # Run emergency unlock
   node scripts/emergency-unlock-super-admin.js admin@awib-saccos.com
   ```

2. **Follow the prompts**:
   - Confirm the account details
   - Provide detailed reason
   - Type "CONFIRM" to proceed

3. **Post-Recovery**:
   - User must change password on next login
   - Review security procedures
   - Create additional super admin accounts

### For Multiple Super Admin Scenario

1. **Use Web Interface** (if available):
   - Login with an active super admin account
   - Navigate to Dashboard → Super Admin Management
   - Review locked accounts
   - Unlock with detailed reason

2. **Use Script Method** (if web unavailable):
   ```bash
   node scripts/emergency-unlock-super-admin.js locked@admin.email
   ```

### For Complete System Lockout

1. **Emergency Database Access**:
   ```sql
   -- Connect to PostgreSQL directly
   UPDATE "Users" 
   SET "lockoutUntil" = NULL, 
       "failedLoginAttempts" = 0,
       "forcePasswordChange" = true
   WHERE role = 'super_admin' 
   AND email = 'admin@awib-saccos.com';
   ```

2. **Follow up with script**:
   ```bash
   node scripts/emergency-unlock-super-admin.js admin@awib-saccos.com
   ```

## 🚨 Emergency Contacts and Procedures

### Before Lockout (Preventive)

1. **Regular Checks**:
   ```bash
   # Weekly security check
   node scripts/manage-super-admins.js check
   ```

2. **Create Backup Admins**:
   ```bash
   # Create additional super admin
   node scripts/manage-super-admins.js create
   ```

### During Lockout (Response)

1. **Assess Situation**:
   - How many super admins are locked?
   - Are any super admins still active?
   - Is the web interface accessible?

2. **Choose Appropriate Method**:
   - Web interface (if super admin available)
   - Emergency script (if server access available)
   - Database direct access (last resort)

3. **Document and Report**:
   - Log all actions taken
   - Document root cause
   - Update security procedures

### After Lockout (Recovery)

1. **Security Review**:
   - Why did the lockout occur?
   - Were procedures followed?
   - What can be improved?

2. **Preventive Actions**:
   - Create additional super admin accounts
   - Update documentation
   - Train additional staff

## 📝 Best Practices

1. **Never have only one super admin account**
2. **Regularly test recovery procedures**
3. **Maintain up-to-date documentation**
4. **Monitor account security status**
5. **Keep emergency contact information current**
6. **Ensure multiple people know recovery procedures**
7. **Regular backup of critical account information**

## 🔍 Monitoring and Alerts

### Dashboard Indicators

- **Security Status**: GOOD/WARNING/CRITICAL
- **Active Super Admins Count**: Should be ≥ 2
- **Locked Accounts**: Should be 0
- **Last Security Check**: Should be recent

### Automated Checks

The system provides:
- Real-time security status
- Failed login attempt monitoring
- Lockout warnings
- Account status summaries

### Regular Maintenance

1. **Weekly**: Check super admin security status
2. **Monthly**: Review audit logs
3. **Quarterly**: Test emergency procedures
4. **Annually**: Update recovery documentation

## 📞 Emergency Response Team

Ensure the following roles have access to recovery procedures:

1. **System Administrator**: Full server access
2. **Database Administrator**: Database recovery access
3. **IT Security Manager**: Policy and procedure oversight
4. **Backup Super Admin**: Alternative administrative access

## 🔧 Technical Requirements

### Server Access Required For:
- Emergency unlock script execution
- Database direct access
- Log file review

### Permissions Needed:
- Read/write access to application directory
- Database connection permissions
- Log file access rights

### Dependencies:
- Node.js runtime
- Database connectivity
- Application environment variables

---

## Quick Reference Commands

```bash
# Emergency unlock
node scripts/emergency-unlock-super-admin.js <email>

# Check security status
node scripts/manage-super-admins.js check

# List all super admins
node scripts/manage-super-admins.js list

# Create new super admin
node scripts/manage-super-admins.js create

# Promote user to super admin
node scripts/manage-super-admins.js promote
```

**Remember**: Always document any emergency actions taken and review security procedures after any lockout incident.
