const { User, Role, UserRole } = require('../models');

/**
 * Bootstrap admin user with super_admin role for initial system setup
 */
const bootstrapAdminUser = async () => {
  try {
    console.log('🔧 Checking for admin user bootstrap...');
    
    // Find the super_admin role
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    if (!superAdminRole) {
      console.log('⚠️ Super admin role not found. Run seeders first.');
      return;
    }

    // Find all admin and super_admin users
    const adminUsers = await User.findAll({ 
      where: { 
        role: ['admin', 'super_admin'] 
      } 
    });
    
    if (adminUsers.length === 0) {
      console.log('⚠️ No admin users found. Please create an admin user first.');
      return;
    }

    // Check if any admin user already has the super_admin role
    for (const adminUser of adminUsers) {
      const existingUserRole = await UserRole.findOne({
        where: { 
          userId: adminUser.id, 
          roleId: superAdminRole.id,
          isActive: true 
        }
      });

      if (!existingUserRole) {
        // Assign super_admin role to this admin user
        await UserRole.create({
          userId: adminUser.id,
          roleId: superAdminRole.id,
          assignedBy: adminUser.id, // Self-assigned for bootstrap
          assignedAt: new Date(),
          isActive: true
        });

        console.log(`✅ Assigned super_admin role to user: ${adminUser.email}`);
      } else {
        console.log(`✅ User ${adminUser.email} already has super_admin role`);
      }
    }

  } catch (error) {
    console.error('❌ Error bootstrapping admin user:', error.message);
  }
};

module.exports = { bootstrapAdminUser };
