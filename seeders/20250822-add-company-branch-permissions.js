// seeders/20250822-add-company-branch-permissions.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Define new permissions for Company and Branches modules
    const newPermissions = [
      // Company Settings Permissions
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'system.settings.view',
        description: 'View company settings and configuration',
        module: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'system.settings.manage',
        description: 'Manage company settings and configuration',
        module: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'system.company.logo.upload',
        description: 'Upload and manage company logo',
        module: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'system.business_rules.manage',
        description: 'Manage business rules and policies',
        module: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Branch Management Permissions
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.view',
        description: 'View branches and branch information',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.create',
        description: 'Create new branches',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.update',
        description: 'Update branch information',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.delete',
        description: 'Delete or deactivate branches',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.manage_accounts',
        description: 'Generate account numbers and manage branch accounts',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.assign_staff',
        description: 'Assign managers and staff to branches',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.manage_operations',
        description: 'Manage branch operational settings and controls',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.fn('uuid_generate_v4'),
        name: 'branches.view_statistics',
        description: 'View branch performance statistics and reports',
        module: 'branches',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert the new permissions
    await queryInterface.bulkInsert('Permissions', newPermissions);

    // Get role IDs
    const roles = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Roles" WHERE name IN (:roleNames)',
      {
        replacements: { roleNames: ['super_admin', 'admin', 'manager', 'branch_manager'] },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });

    // Get permission IDs
    const permissions = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Permissions" WHERE name IN (:permissionNames)',
      {
        replacements: { 
          permissionNames: newPermissions.map(p => p.name)
        },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    const permissionMap = {};
    permissions.forEach(permission => {
      permissionMap[permission.name] = permission.id;
    });

    // Define role-permission mappings
    const rolePermissions = [];

    // Super Admin - All permissions
    Object.values(permissionMap).forEach(permissionId => {
      if (roleMap.super_admin) {
        rolePermissions.push({
          id: Sequelize.fn('uuid_generate_v4'),
          roleId: roleMap.super_admin,
          permissionId: permissionId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    // Admin - All permissions except super admin specific ones
    Object.entries(permissionMap).forEach(([permissionName, permissionId]) => {
      if (roleMap.admin) {
        rolePermissions.push({
          id: Sequelize.fn('uuid_generate_v4'),
          roleId: roleMap.admin,
          permissionId: permissionId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    // Manager - View and limited management permissions
    const managerPermissions = [
      'system.settings.view',
      'branches.view',
      'branches.view_statistics',
      'branches.manage_accounts'
    ];

    managerPermissions.forEach(permissionName => {
      if (roleMap.manager && permissionMap[permissionName]) {
        rolePermissions.push({
          id: Sequelize.fn('uuid_generate_v4'),
          roleId: roleMap.manager,
          permissionId: permissionMap[permissionName],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    // Branch Manager - Branch specific permissions
    const branchManagerPermissions = [
      'system.settings.view',
      'branches.view',
      'branches.update', // Can update their own branch
      'branches.manage_accounts',
      'branches.manage_operations',
      'branches.view_statistics'
    ];

    branchManagerPermissions.forEach(permissionName => {
      if (roleMap.branch_manager && permissionMap[permissionName]) {
        rolePermissions.push({
          id: Sequelize.fn('uuid_generate_v4'),
          roleId: roleMap.branch_manager,
          permissionId: permissionMap[permissionName],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    // Insert role-permission relationships
    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('RolePermissions', rolePermissions);
    }

    console.log('✅ Company and Branches permissions seeded successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the permissions we added
    const permissionNames = [
      'system.settings.view',
      'system.settings.manage',
      'system.company.logo.upload',
      'system.business_rules.manage',
      'branches.view',
      'branches.create',
      'branches.update',
      'branches.delete',
      'branches.manage_accounts',
      'branches.assign_staff',
      'branches.manage_operations',
      'branches.view_statistics'
    ];

    await queryInterface.bulkDelete('Permissions', {
      name: {
        [Sequelize.Op.in]: permissionNames
      }
    });

    console.log('✅ Company and Branches permissions removed successfully');
  }
};
