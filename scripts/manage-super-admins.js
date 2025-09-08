#!/usr/bin/env node

/**
 * Super Admin Management Script
 * 
 * This script helps manage super admin accounts to prevent complete lockout scenarios.
 * It can:
 * 1. List all super admin accounts
 * 2. Create additional super admin accounts
 * 3. Check for single points of failure
 * 
 * Usage: node scripts/manage-super-admins.js [action]
 * Actions: list, create, check, promote
 */

const { User, Role, UserRole, ActivityLog } = require('../models');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function listSuperAdmins() {
  console.log('📋 Current Super Admin Accounts:\n');
  
  const superAdmins = await User.findAll({
    where: { role: 'super_admin' },
    attributes: ['id', 'email', 'firstName', 'lastName', 'lockoutUntil', 'failedLoginAttempts', 'lastLogin', 'status']
  });

  if (superAdmins.length === 0) {
    console.log('❌ NO SUPER ADMIN ACCOUNTS FOUND!');
    console.log('🚨 This is a critical security issue - the system has no super admins!');
    return [];
  }

  superAdmins.forEach((admin, index) => {
    const status = admin.lockoutUntil ? '🔒 LOCKED' : '✅ ACTIVE';
    const activeStatus = admin.status === 'active' ? 'ENABLED' : 'DISABLED';
    
    console.log(`${index + 1}. ${admin.email}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Status: ${status} | Account: ${activeStatus}`);
    console.log(`   Failed Attempts: ${admin.failedLoginAttempts || 0}`);
    console.log(`   Last Login: ${admin.lastLogin || 'Never'}`);
    if (admin.lockoutUntil) {
      console.log(`   Locked Until: ${admin.lockoutUntil}`);
    }
    console.log('');
  });

  return superAdmins;
}

async function checkSuperAdminSecurity() {
  console.log('🔍 Checking Super Admin Security Status:\n');
  
  const superAdmins = await User.findAll({
    where: { role: 'super_admin' },
    attributes: ['id', 'email', 'lockoutUntil', 'status']
  });

  const totalSuperAdmins = superAdmins.length;
  const activeSuperAdmins = superAdmins.filter(admin => admin.status === 'active' && !admin.lockoutUntil);
  const lockedSuperAdmins = superAdmins.filter(admin => admin.lockoutUntil);
  const disabledSuperAdmins = superAdmins.filter(admin => admin.status !== 'active');

  console.log(`📊 Super Admin Summary:`);
  console.log(`   Total Super Admins: ${totalSuperAdmins}`);
  console.log(`   Active & Unlocked: ${activeSuperAdmins.length}`);
  console.log(`   Locked: ${lockedSuperAdmins.length}`);
  console.log(`   Disabled: ${disabledSuperAdmins.length}`);

  // Security recommendations
  console.log('\n🛡️  Security Analysis:');
  
  if (totalSuperAdmins === 0) {
    console.log('❌ CRITICAL: No super admin accounts exist!');
  } else if (totalSuperAdmins === 1) {
    console.log('⚠️  WARNING: Only one super admin account exists (single point of failure)');
  } else if (activeSuperAdmins.length === 0) {
    console.log('🚨 CRITICAL: All super admin accounts are locked or disabled!');
  } else if (activeSuperAdmins.length === 1) {
    console.log('⚠️  WARNING: Only one active super admin account available');
  } else {
    console.log('✅ GOOD: Multiple active super admin accounts available');
  }

  console.log('\n📝 Recommendations:');
  if (totalSuperAdmins < 2) {
    console.log('   • Create at least 2 super admin accounts for redundancy');
  }
  if (activeSuperAdmins.length < 2) {
    console.log('   • Ensure at least 2 super admins are active and unlocked');
  }
  if (lockedSuperAdmins.length > 0) {
    console.log('   • Review and unlock legitimate super admin accounts');
  }

  return {
    total: totalSuperAdmins,
    active: activeSuperAdmins.length,
    locked: lockedSuperAdmins.length,
    disabled: disabledSuperAdmins.length
  };
}

async function createSuperAdmin() {
  console.log('👤 Creating New Super Admin Account:\n');

  const email = await question('Enter email address: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Valid email address is required');
    return;
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    console.error(`❌ User with email ${email} already exists`);
    return;
  }

  const firstName = await question('Enter first name: ');
  const lastName = await question('Enter last name: ');
  const password = await question('Enter password (minimum 8 characters): ');

  if (!firstName || !lastName) {
    console.error('❌ First name and last name are required');
    return;
  }

  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    return;
  }

  const confirm = await question(`\nCreate super admin account for ${email}? (y/N): `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Operation cancelled');
    return;
  }

  try {
    // Create the user
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = await User.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      role: 'super_admin',
      status: 'active',
      twoFactorEnabled: true, // Enable 2FA for security
      forcePasswordChange: true, // Force password change on first login
      emailVerified: true // Mark as verified since it's created by admin
    });

    // Log the activity
    await ActivityLog.create({
      action: 'SUPER_ADMIN_CREATED',
      userId: newUser.id,
      details: {
        createdBy: 'SYSTEM_SCRIPT',
        email: email,
        timestamp: new Date()
      },
      ipAddress: 'SERVER_DIRECT',
      userAgent: 'Super Admin Management Script',
      status: 'success'
    });

    console.log('✅ Super admin account created successfully!');
    console.log(`\n📋 Account Details:`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: super_admin`);
    console.log(`   2FA Enabled: Yes`);
    console.log(`   Must Change Password: Yes`);

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
  }
}

async function promoteToSuperAdmin() {
  console.log('⬆️  Promoting Existing User to Super Admin:\n');

  const email = await question('Enter email of user to promote: ');
  if (!email) {
    console.error('❌ Email is required');
    return;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    return;
  }

  if (user.role === 'super_admin') {
    console.log(`✅ User ${email} is already a super admin`);
    return;
  }

  console.log(`\n📋 Current User Details:`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Current Role: ${user.role}`);
  console.log(`   Active: ${user.status === 'active' ? 'Yes' : 'No'}`);
  console.log(`   Locked: ${user.lockoutUntil ? 'Yes' : 'No'}`);

  const reason = await question('Enter reason for promotion: ');
  if (!reason || reason.trim().length < 10) {
    console.error('❌ A detailed reason (minimum 10 characters) is required');
    return;
  }

  const confirm = await question(`\nPromote ${email} to super admin? (y/N): `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Operation cancelled');
    return;
  }

  try {
    await user.update({
      role: 'super_admin',
      twoFactorEnabled: true, // Enable 2FA for security
      forcePasswordChange: true, // Force password change for security
      lockoutUntil: null, // Clear any lockout
      failedLoginAttempts: 0 // Reset failed attempts
    });

    // Log the activity
    await ActivityLog.create({
      action: 'USER_PROMOTED_TO_SUPER_ADMIN',
      userId: user.id,
      details: {
        promotedBy: 'SYSTEM_SCRIPT',
        previousRole: user.role,
        newRole: 'super_admin',
        reason: reason,
        timestamp: new Date()
      },
      ipAddress: 'SERVER_DIRECT',
      userAgent: 'Super Admin Management Script',
      status: 'warning'
    });

    console.log('✅ User promoted to super admin successfully!');
    console.log('\n📝 Changes made:');
    console.log('   • Role changed to super_admin');
    console.log('   • 2FA enabled');
    console.log('   • Password change required on next login');
    console.log('   • Any account lockout cleared');

  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
  }
}

async function main() {
  const action = process.argv[2] || 'check';

  console.log('🛡️  SUPER ADMIN MANAGEMENT UTILITY\n');

  try {
    switch (action.toLowerCase()) {
      case 'list':
        await listSuperAdmins();
        break;
      
      case 'create':
        await createSuperAdmin();
        break;
      
      case 'check':
        await checkSuperAdminSecurity();
        break;
      
      case 'promote':
        await promoteToSuperAdmin();
        break;
      
      default:
        console.log('Available actions:');
        console.log('  list     - List all super admin accounts');
        console.log('  create   - Create a new super admin account');
        console.log('  check    - Check super admin security status');
        console.log('  promote  - Promote existing user to super admin');
        console.log('\nUsage: node scripts/manage-super-admins.js [action]');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Operation cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the script
main();
