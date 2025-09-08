#!/usr/bin/env node

/**
 * Emergency Super Admin Account Unlock Script
 * 
 * This script provides a way to unlock super admin accounts when they get locked out.
 * It should only be used in emergency situations and requires direct server access.
 * 
 * Usage: node scripts/emergency-unlock-super-admin.js <email>
 * Example: node scripts/emergency-unlock-super-admin.js admin@awib-saccos.com
 */

const { User, ActivityLog, AccountUnlockLog } = require('../models');
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

async function emergencyUnlockSuperAdmin() {
  try {
    console.log('🚨 EMERGENCY SUPER ADMIN UNLOCK UTILITY 🚨\n');
    console.log('This tool should only be used in emergency situations!');
    console.log('Ensure you have proper authorization before proceeding.\n');

    // Get email from command line or prompt
    const email = process.argv[2] || await question('Enter the super admin email to unlock: ');

    if (!email) {
      console.error('❌ Email is required');
      process.exit(1);
    }

    // Find the user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Verify it's a super admin
    if (user.role !== 'super_admin') {
      console.error(`❌ User ${email} is not a super admin (role: ${user.role})`);
      console.error('This script is only for super admin accounts');
      process.exit(1);
    }

    // Show current status
    console.log(`\n📋 User Details:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Locked: ${user.lockoutUntil ? 'YES' : 'NO'}`);
    console.log(`   Failed Attempts: ${user.failedLoginAttempts || 0}`);
    if (user.lockoutUntil) {
      console.log(`   Locked Until: ${user.lockoutUntil}`);
    }

    if (!user.lockoutUntil) {
      console.log('\n✅ This account is not currently locked');
      const proceed = await question('Do you want to reset failed login attempts anyway? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }

    // Confirm the action
    console.log('\n⚠️  WARNING: This will immediately unlock the account and reset all lockout fields!');
    const confirm = await question('Are you sure you want to proceed? Type "CONFIRM" to continue: ');
    
    if (confirm !== 'CONFIRM') {
      console.log('Operation cancelled');
      process.exit(0);
    }

    // Additional security check - require a reason
    const reason = await question('Enter a reason for this emergency unlock: ');
    if (!reason || reason.trim().length < 10) {
      console.error('❌ A detailed reason (minimum 10 characters) is required for audit purposes');
      process.exit(1);
    }

    // Perform the unlock
    console.log('\n🔓 Unlocking account...');

    await user.update({
      lockoutUntil: null,
      failedLoginAttempts: 0,
      twoFactorEnabled: true, // Ensure 2FA is enabled for security
      forcePasswordChange: true // Force password change on next login
    });

    // Log the activity
    await ActivityLog.create({
      action: 'EMERGENCY_SUPER_ADMIN_UNLOCK',
      userId: user.id,
      details: {
        reason: reason,
        unlockedBy: 'SYSTEM_EMERGENCY_SCRIPT',
        timestamp: new Date(),
        serverInfo: {
          hostname: require('os').hostname(),
          platform: require('os').platform()
        }
      },
      ipAddress: 'SERVER_DIRECT',
      userAgent: 'Emergency Unlock Script',
      status: 'warning'
    });

    // Create unlock log entry
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: null, // No admin for emergency unlock
      reason: `EMERGENCY UNLOCK: ${reason}`,
      method: 'EMERGENCY_SCRIPT',
      ipAddress: 'SERVER_DIRECT',
      userAgent: 'Emergency Unlock Script'
    });

    console.log('✅ Account successfully unlocked!');
    console.log('\n📝 Next Steps:');
    console.log('   1. The user will be forced to change their password on next login');
    console.log('   2. 2FA has been enabled for additional security');
    console.log('   3. This action has been logged for audit purposes');
    console.log('   4. Consider reviewing security procedures to prevent future lockouts');

    // Show final status
    const updatedUser = await User.findByPk(user.id);
    console.log(`\n📋 Updated Status:`);
    console.log(`   Locked: ${updatedUser.lockoutUntil ? 'YES' : 'NO'}`);
    console.log(`   Failed Attempts: ${updatedUser.failedLoginAttempts || 0}`);
    console.log(`   Force Password Change: ${updatedUser.forcePasswordChange ? 'YES' : 'NO'}`);
    console.log(`   2FA Enabled: ${updatedUser.twoFactorEnabled ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error during emergency unlock:', error.message);
    console.error(error.stack);
    process.exit(1);
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
emergencyUnlockSuperAdmin();
