const { User } = require('../models');
const colors = require('colors');

const fixAdminPassword = async () => {
  try {
    console.log('🔧 Fixing admin user password...');
    
    // Find the admin user
    const adminUser = await User.findOne({
      where: {
        email: 'godwinkiwovel@gmail.com'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found'.red);
      return;
    }

    console.log('👤 Found admin user, updating password...');
    
    // Update the password - the beforeSave hook will hash it properly
    await adminUser.update({
      password: 'Admin@255', // Plain password - will be hashed by beforeSave hook
      failedLoginAttempts: 0, // Reset any failed attempts
      lockoutUntil: null // Clear any lockout
    });

    console.log('✅ Admin user password fixed successfully'.green);
    console.log('📧 Email: godwinkiwovel@gmail.com'.cyan);
    console.log('🔐 Password: Admin@255'.cyan);
    
  } catch (error) {
    console.error('❌ Error fixing admin user password:', error.message);
  }
};

// Run if called directly
if (require.main === module) {
  fixAdminPassword()
    .then(() => {
      console.log('✅ Password fix completed successfully'.green);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Password fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixAdminPassword };
