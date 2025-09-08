'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Define additional missing permissions based on actual application usage
    const additionalPermissions = [
      // Member uploads and file management
      { module: 'members', resource: 'uploads', action: 'upload', displayName: 'Upload Member Files', description: 'Upload documents and files for members' },
      { module: 'members', resource: 'files', action: 'view', displayName: 'View Member Files', description: 'View member uploaded files' },
      { module: 'members', resource: 'files', action: 'delete', displayName: 'Delete Member Files', description: 'Delete member files' },
      { module: 'members', resource: 'documents', action: 'upload', displayName: 'Upload Member Documents', description: 'Upload member documents' },
      { module: 'members', resource: 'documents', action: 'download', displayName: 'Download Member Documents', description: 'Download member documents' },

      // Account types management
      { module: 'accounting', resource: 'account_types', action: 'view', displayName: 'View Account Types', description: 'View account type configurations' },
      { module: 'accounting', resource: 'account_types', action: 'list', displayName: 'List Account Types', description: 'List all account types' },
      { module: 'accounting', resource: 'account_types', action: 'create', displayName: 'Create Account Types', description: 'Create new account types' },
      { module: 'accounting', resource: 'account_types', action: 'update', displayName: 'Update Account Types', description: 'Modify account types' },
      { module: 'accounting', resource: 'account_types', action: 'delete', displayName: 'Delete Account Types', description: 'Remove account types' },

      // Chart of accounts
      { module: 'accounting', resource: 'chart_of_accounts', action: 'view', displayName: 'View Chart of Accounts', description: 'View chart of accounts' },
      { module: 'accounting', resource: 'chart_of_accounts', action: 'manage', displayName: 'Manage Chart of Accounts', description: 'Create and modify chart of accounts' },

      // Communications - fix naming inconsistencies
      { module: 'communications', resource: 'sms', action: 'view_history', displayName: 'View SMS History', description: 'View SMS message history and details' },
      { module: 'communications', resource: 'sms', action: 'view_stats', displayName: 'View SMS Statistics', description: 'View SMS usage statistics and reports' },
      { module: 'communications', resource: 'templates', action: 'create', displayName: 'Create SMS Templates', description: 'Create reusable SMS templates' },
      { module: 'communications', resource: 'templates', action: 'manage', displayName: 'Manage SMS Templates', description: 'Edit and delete SMS templates' },

      // File uploads - general
      { module: 'system', resource: 'files', action: 'upload', displayName: 'Upload Files', description: 'Upload files to the system' },
      { module: 'system', resource: 'files', action: 'download', displayName: 'Download Files', description: 'Download files from the system' },
      { module: 'system', resource: 'files', action: 'delete', displayName: 'Delete Files', description: 'Delete files from the system' },

      // Document management
      { module: 'documents', resource: 'files', action: 'upload', displayName: 'Upload Documents', description: 'Upload document files' },
      { module: 'documents', resource: 'files', action: 'download', displayName: 'Download Documents', description: 'Download document files' },
      { module: 'documents', resource: 'files', action: 'view', displayName: 'View Documents', description: 'View document files' },
      { module: 'documents', resource: 'categories', action: 'manage', displayName: 'Manage Document Categories', description: 'Create and manage document categories' },

      // Additional system permissions
      { module: 'system', resource: 'backup', action: 'create', displayName: 'Create Backups', description: 'Create system backups' },
      { module: 'system', resource: 'backup', action: 'restore', displayName: 'Restore Backups', description: 'Restore system from backups' },
      { module: 'system', resource: 'logs', action: 'view', displayName: 'View System Logs', description: 'View system logs and errors' },
      { module: 'system', resource: 'maintenance', action: 'execute', displayName: 'System Maintenance', description: 'Execute system maintenance tasks' },

      // Member account specific permissions
      { module: 'members', resource: 'accounts', action: 'view_balance', displayName: 'View Account Balances', description: 'View member account balances' },
      { module: 'members', resource: 'accounts', action: 'view_transactions', displayName: 'View Account Transactions', description: 'View member account transaction history' },
      { module: 'members', resource: 'accounts', action: 'freeze', displayName: 'Freeze Accounts', description: 'Freeze member accounts' },
      { module: 'members', resource: 'accounts', action: 'unfreeze', displayName: 'Unfreeze Accounts', description: 'Unfreeze member accounts' },

      // Dashboard and reports
      { module: 'system', resource: 'dashboard', action: 'view', displayName: 'View Dashboard', description: 'Access system dashboard' },
      { module: 'reports', resource: 'financial', action: 'generate', displayName: 'Generate Financial Reports', description: 'Generate financial reports' },
      { module: 'reports', resource: 'member', action: 'generate', displayName: 'Generate Member Reports', description: 'Generate member reports' },
      { module: 'reports', resource: 'custom', action: 'create', displayName: 'Create Custom Reports', description: 'Create custom reports' },

      // Notifications
      { module: 'notifications', resource: 'system', action: 'send', displayName: 'Send System Notifications', description: 'Send system notifications' },
      { module: 'notifications', resource: 'email', action: 'send', displayName: 'Send Email Notifications', description: 'Send email notifications' },
      { module: 'notifications', resource: 'settings', action: 'manage', displayName: 'Manage Notification Settings', description: 'Configure notification settings' }
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

    console.log(`📋 Found ${existingPermissionNames.length} existing permissions`);
    console.log(`➕ Adding ${newPermissions.length} new permissions`);

    if (newPermissions.length > 0) {
      // Insert new permissions
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
      console.log(`✅ Added ${newPermissions.length} new permissions`);
    }

    // Get super admin role and assign ALL permissions (new and existing)
    const superAdminRole = await queryInterface.sequelize.query(
      'SELECT id FROM "Roles" WHERE name = \'super_admin\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (superAdminRole.length > 0) {
      // Get ALL permissions in the system
      const allPermissions = await queryInterface.sequelize.query(
        'SELECT id FROM "Permissions"',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // Check which permissions super_admin already has
      const existingRolePermissions = await queryInterface.sequelize.query(
        'SELECT "permissionId" FROM "RolePermissions" WHERE "roleId" = :roleId',
        {
          replacements: { roleId: superAdminRole[0].id },
          type: queryInterface.sequelize.QueryTypes.SELECT
        }
      );

      const existingPermissionIds = new Set(existingRolePermissions.map(rp => rp.permissionId));
      const newRolePermissions = allPermissions.filter(p => !existingPermissionIds.has(p.id));

      console.log(`📋 Super admin currently has ${existingRolePermissions.length} permissions`);
      console.log(`➕ Granting ${newRolePermissions.length} missing permissions to super_admin`);

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
        console.log(`✅ Granted ${newRolePermissions.length} permissions to super_admin`);
      }

      // Final count
      const finalCount = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM "RolePermissions" WHERE "roleId" = :roleId',
        {
          replacements: { roleId: superAdminRole[0].id },
          type: queryInterface.sequelize.QueryTypes.SELECT
        }
      );

      console.log(`🎉 Super admin now has ${finalCount[0].count} total permissions`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the permissions added in this seeder
    const permissionNames = [
      'members.uploads.upload', 'members.files.view', 'members.files.delete',
      'accounting.account_types.view', 'accounting.account_types.list', 
      'accounting.account_types.create', 'accounting.account_types.update',
      'communications.sms.view_history', 'communications.sms.view_stats',
      'system.files.upload', 'system.files.download', 'documents.files.upload'
    ];

    await queryInterface.bulkDelete('Permissions', {
      name: {
        [Sequelize.Op.in]: permissionNames
      }
    });
  }
};
