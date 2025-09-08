'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    console.log('🔄 Adding members.uploads.upload permission to additional roles...');
    
    // 1. Find the members.uploads.upload permission
    const uploadPermission = await queryInterface.sequelize.query(
      'SELECT id FROM "Permissions" WHERE name = \'members.uploads.upload\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (uploadPermission.length === 0) {
      console.log('❌ members.uploads.upload permission not found in the database!');
      return;
    }

    const permissionId = uploadPermission[0].id;
    console.log(`✅ Found permission with ID: ${permissionId}`);

    // 2. Get roles that should have this permission
    const targetRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Roles" WHERE name IN (\'admin\', \'manager\', \'clerk\')',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (targetRoles.length === 0) {
      console.log('❌ No target roles found!');
      return;
    }

    console.log(`✅ Found ${targetRoles.length} target roles`);

    // 3. Check which roles already have the permission
    const existingAssignments = await queryInterface.sequelize.query(
      'SELECT "roleId" FROM "RolePermissions" WHERE "permissionId" = :permissionId',
      {
        replacements: { permissionId },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    );

    const rolesWithPermission = new Set(existingAssignments.map(rp => rp.roleId));

    // 4. Create new role-permission assignments
    const newRolePermissions = [];

    for (const role of targetRoles) {
      if (!rolesWithPermission.has(role.id)) {
        newRolePermissions.push({
          id: uuidv4(),
          roleId: role.id,
          permissionId: permissionId,
          grantedAt: now,
          createdAt: now,
          updatedAt: now
        });
        console.log(`➕ Will add permission to role: ${role.name}`);
      } else {
        console.log(`ℹ️ Role ${role.name} already has this permission`);
      }
    }

    // 5. Insert new role-permission mappings
    if (newRolePermissions.length > 0) {
      await queryInterface.bulkInsert('RolePermissions', newRolePermissions);
      console.log(`✅ Successfully added members.uploads.upload permission to ${newRolePermissions.length} roles`);
    } else {
      console.log('ℹ️ No new role-permission assignments needed');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Find permission ID
    const uploadPermission = await queryInterface.sequelize.query(
      'SELECT id FROM "Permissions" WHERE name = \'members.uploads.upload\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (uploadPermission.length === 0) {
      return;
    }

    const permissionId = uploadPermission[0].id;

    // Find roles to remove permission from
    const targetRoles = await queryInterface.sequelize.query(
      'SELECT id FROM "Roles" WHERE name IN (\'admin\', \'manager\', \'clerk\')',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const roleIds = targetRoles.map(role => role.id);

    // Remove role-permission assignments
    await queryInterface.bulkDelete('RolePermissions', {
      permissionId: permissionId,
      roleId: {
        [Sequelize.Op.in]: roleIds
      }
    });

    console.log('✅ Removed members.uploads.upload permission from specified roles');
  }
};
