/**
 * Script to reset and reseed roles and permissions
 * This will clear existing permissions and recreate them with SMS permissions included
 */

const { Role, Permission, RolePermission, UserRole } = require('../models');
const colors = require('colors');

const resetPermissions = async () => {
  try {
    console.log('🔄 Resetting roles and permissions...'.yellow);

    // Clear existing role-permission relationships
    console.log('🗑️ Clearing role-permission relationships...'.cyan);
    await RolePermission.destroy({ where: {} });

    // Clear existing permissions
    console.log('🗑️ Clearing existing permissions...'.cyan);
    await Permission.destroy({ where: {} });

    // Clear existing roles (but keep user-role relationships for now)
    console.log('🗑️ Clearing existing roles...'.cyan);
    await Role.destroy({ where: {} });

    console.log('✅ Cleared existing data'.green);

    // Now run the updated seeder
    console.log('🌱 Re-seeding roles and permissions with SMS permissions...'.yellow);
    
    const rolesSeederData = require('../seeders/20250818-seed-roles-permissions');
    const { sequelize } = require('../models');
    
    await rolesSeederData.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('✅ Roles and permissions reseeded successfully!'.green);
    
    // Run the permissions update seeder as well
    console.log('🔄 Running permissions update seeder...'.cyan);
    const permissionsUpdateSeeder = require('../seeders/20250818-update-permissions-seed');
    await permissionsUpdateSeeder.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('✅ Additional permissions seeded'.green);
    console.log('🎉 Permission reset completed! SMS permissions are now available.'.green);
    
  } catch (error) {
    console.error('❌ Error resetting permissions:'.red, error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  resetPermissions();
}

module.exports = resetPermissions;
