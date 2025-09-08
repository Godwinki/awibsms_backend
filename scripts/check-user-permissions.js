const { User, Role, Permission, UserRole, RolePermission } = require('../models');
const { Sequelize } = require('sequelize');
const colors = require('colors');

async function checkUserPermissions() {
  try {
    console.log('🔍 Checking user permissions and roles...'.yellow);
    
    // 1. Find super_admin role
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    if (!superAdminRole) {
      console.log('❌ super_admin role not found in database!'.red);
      return;
    }
    console.log(`✅ Found super_admin role (ID: ${superAdminRole.id})`.green);
    
    // 2. Check if role has the required permission
    const uploadPermission = await Permission.findOne({
      where: { name: 'members.uploads.upload' }
    });
    
    if (!uploadPermission) {
      console.log('❌ members.uploads.upload permission not found!'.red);
      return;
    }
    console.log(`✅ Found upload permission (ID: ${uploadPermission.id})`.green);
    
    // 3. Check role-permission connection
    const rolePermission = await RolePermission.findOne({
      where: {
        roleId: superAdminRole.id,
        permissionId: uploadPermission.id
      }
    });
    
    if (!rolePermission) {
      console.log('❌ super_admin role does NOT have the upload permission!'.red);
    } else {
      console.log('✅ super_admin role has the upload permission'.green);
    }
    
    // 4. Find users with super_admin role
    const superAdminUsers = await User.findAll({
      include: [{
        model: Role,
        as: 'roles',
        where: { name: 'super_admin' }
      }]
    });
    
    if (superAdminUsers.length === 0) {
      console.log('❌ No users with super_admin role found!'.red);
      return;
    }
    
    console.log(`\n📋 Users with super_admin role (${superAdminUsers.length}):`.cyan);
    for (const user of superAdminUsers) {
      console.log(`• ${user.email}`.green);
      
      // 5. Check if user-role connection is active
      const userRole = await UserRole.findOne({
        where: { 
          userId: user.id, 
          roleId: superAdminRole.id,
          isActive: true
        }
      });
      
      if (!userRole) {
        console.log(`  ❌ User's super_admin role is NOT active!`.red);
      } else if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        console.log(`  ❌ User's super_admin role has EXPIRED! (${userRole.expiresAt})`.red);
      } else {
        console.log(`  ✅ User's super_admin role is active`.green);
      }
    }
    
    // 6. Check user session implementation
    console.log('\n🔍 Checking permissions middleware requirements:'.cyan);
    const permMiddleware = require('../modules/auth/middleware/permissionMiddleware');
    console.log('- Permission middleware loaded successfully'.green);
    
    // Success
    console.log('\n✅ Permission check complete. See results above.'.green);
    
  } catch (error) {
    console.error('❌ Error checking permissions:'.red, error);
  } finally {
    process.exit(0);
  }
}

// Run the diagnostic
checkUserPermissions();
