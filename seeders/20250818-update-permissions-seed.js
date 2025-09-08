'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Add missing role management permissions
    const additionalPermissions = [
      { module: 'system', resource: 'roles', action: 'create', displayName: 'Create Roles', description: 'Create new system roles' },
      { module: 'system', resource: 'roles', action: 'read', displayName: 'View Roles', description: 'View system roles' },
      { module: 'system', resource: 'roles', action: 'update', displayName: 'Update Roles', description: 'Modify system roles' },
      { module: 'system', resource: 'roles', action: 'delete', displayName: 'Delete Roles', description: 'Remove system roles' },
      { module: 'system', resource: 'roles', action: 'assign', displayName: 'Assign Roles', description: 'Assign roles to users' },
      
      { module: 'system', resource: 'permissions', action: 'create', displayName: 'Create Permissions', description: 'Create new permissions' },
      { module: 'system', resource: 'permissions', action: 'read', displayName: 'View Permissions', description: 'View system permissions' },
      { module: 'system', resource: 'permissions', action: 'update', displayName: 'Update Permissions', description: 'Modify permissions' },
      { module: 'system', resource: 'permissions', action: 'delete', displayName: 'Delete Permissions', description: 'Remove permissions' }
    ];

    // Check which permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT name FROM "Permissions" WHERE name IN (:names)',
      {
        replacements: {
          names: additionalPermissions.map(perm => `${perm.module}.${perm.resource}.${perm.action}`)
        },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    );

    const existingPermissionNames = existingPermissions.map(p => p.name);

    // Filter out permissions that already exist
    const newPermissions = additionalPermissions.filter(perm => 
      !existingPermissionNames.includes(`${perm.module}.${perm.resource}.${perm.action}`)
    );

    if (newPermissions.length > 0) {
      // Insert additional permissions
      const permissionRecords = newPermissions.map(perm => ({
        id: uuidv4(),
        name: `${perm.module}.${perm.resource}.${perm.action}`,
        displayName: perm.displayName,
        description: perm.description,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        isSystemPermission: true,
        createdAt: now,
        updatedAt: now
      }));

      await queryInterface.bulkInsert('Permissions', permissionRecords);
    }

    // Get super admin role and assign new permissions
    const superAdminRole = await queryInterface.sequelize.query(
      'SELECT id FROM "Roles" WHERE name = \'super_admin\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (superAdminRole.length > 0) {
      const allRolePermissions = await queryInterface.sequelize.query(
        'SELECT id FROM "Permissions" WHERE name LIKE \'system.roles.%\' OR name LIKE \'system.permissions.%\'',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // Check which role permissions already exist
      const existingRolePermissions = await queryInterface.sequelize.query(
        'SELECT "permissionId" FROM "RolePermissions" WHERE "roleId" = :roleId AND "permissionId" IN (:permissionIds)',
        {
          replacements: {
            roleId: superAdminRole[0].id,
            permissionIds: allRolePermissions.map(p => p.id)
          },
          type: queryInterface.sequelize.QueryTypes.SELECT
        }
      );

      const existingPermissionIds = existingRolePermissions.map(rp => rp.permissionId);
      const newRolePermissions = allRolePermissions.filter(p => !existingPermissionIds.includes(p.id));

      if (newRolePermissions.length > 0) {
        const rolePermissions = newRolePermissions.map(permission => ({
          id: uuidv4(),
          roleId: superAdminRole[0].id,
          permissionId: permission.id,
          grantedAt: now,
          createdAt: now,
          updatedAt: now
        }));

        await queryInterface.bulkInsert('RolePermissions', rolePermissions);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Permissions', {
      name: {
        [Sequelize.Op.like]: 'system.roles.%'
      }
    });
    await queryInterface.bulkDelete('Permissions', {
      name: {
        [Sequelize.Op.like]: 'system.permissions.%'
      }
    });
  }
};
