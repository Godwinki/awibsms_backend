'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Define all permissions for the banking system
    const permissions = [
      // System Administration
      { module: 'system', resource: 'users', action: 'create', displayName: 'Create Users', description: 'Create new user accounts' },
      { module: 'system', resource: 'users', action: 'read', displayName: 'View Users', description: 'View user accounts and profiles' },
      { module: 'system', resource: 'users', action: 'update', displayName: 'Update Users', description: 'Modify user accounts and profiles' },
      { module: 'system', resource: 'users', action: 'delete', displayName: 'Delete Users', description: 'Delete user accounts' },
      { module: 'system', resource: 'roles', action: 'manage', displayName: 'Manage Roles', description: 'Create, modify, and assign roles' },
      { module: 'system', resource: 'permissions', action: 'manage', displayName: 'Manage Permissions', description: 'Assign and revoke permissions' },
      { module: 'system', resource: 'settings', action: 'manage', displayName: 'System Settings', description: 'Configure system settings' },
      { module: 'system', resource: 'audit', action: 'read', displayName: 'View Audit Logs', description: 'Access system audit logs' },

      // Member Management
      { module: 'members', resource: 'profile', action: 'create', displayName: 'Create Members', description: 'Register new members' },
      { module: 'members', resource: 'profile', action: 'read', displayName: 'View Members', description: 'View member profiles and information' },
      { module: 'members', resource: 'profile', action: 'update', displayName: 'Update Members', description: 'Modify member information' },
      { module: 'members', resource: 'profile', action: 'delete', displayName: 'Delete Members', description: 'Remove member accounts' },
      { module: 'members', resource: 'accounts', action: 'create', displayName: 'Create Member Accounts', description: 'Open new accounts for members' },
      { module: 'members', resource: 'accounts', action: 'read', displayName: 'View Member Accounts', description: 'View member account details' },
      { module: 'members', resource: 'accounts', action: 'update', displayName: 'Update Member Accounts', description: 'Modify member account settings' },
      { module: 'members', resource: 'accounts', action: 'close', displayName: 'Close Member Accounts', description: 'Close member accounts' },
      
      // Member Categories Management
      { module: 'members', resource: 'categories', action: 'create', displayName: 'Create Member Categories', description: 'Create new member categories' },
      { module: 'members', resource: 'categories', action: 'read', displayName: 'View Member Categories', description: 'View member categories and assignments' },
      { module: 'members', resource: 'categories', action: 'update', displayName: 'Update Member Categories', description: 'Modify member categories' },
      { module: 'members', resource: 'categories', action: 'delete', displayName: 'Delete Member Categories', description: 'Remove member categories' },
      { module: 'members', resource: 'categories', action: 'manage', displayName: 'Manage Category Members', description: 'Add and remove members from categories' },

      // Accounting & Transactions
      { module: 'accounting', resource: 'transactions', action: 'create', displayName: 'Create Transactions', description: 'Process financial transactions' },
      { module: 'accounting', resource: 'transactions', action: 'read', displayName: 'View Transactions', description: 'View transaction history and details' },
      { module: 'accounting', resource: 'transactions', action: 'approve', displayName: 'Approve Transactions', description: 'Approve pending transactions' },
      { module: 'accounting', resource: 'transactions', action: 'reverse', displayName: 'Reverse Transactions', description: 'Reverse completed transactions' },
      { module: 'accounting', resource: 'gl', action: 'read', displayName: 'View General Ledger', description: 'Access general ledger accounts' },
      { module: 'accounting', resource: 'gl', action: 'manage', displayName: 'Manage GL Accounts', description: 'Create and modify GL accounts' },
      { module: 'accounting', resource: 'reports', action: 'generate', displayName: 'Generate Reports', description: 'Generate financial reports' },

      // Loans Management
      { module: 'loans', resource: 'applications', action: 'create', displayName: 'Create Loan Applications', description: 'Submit loan applications' },
      { module: 'loans', resource: 'applications', action: 'read', displayName: 'View Loan Applications', description: 'View loan application details' },
      { module: 'loans', resource: 'applications', action: 'process', displayName: 'Process Loan Applications', description: 'Review and process loan applications' },
      { module: 'loans', resource: 'applications', action: 'approve', displayName: 'Approve Loans', description: 'Approve or reject loan applications' },
      { module: 'loans', resource: 'disbursement', action: 'process', displayName: 'Disburse Loans', description: 'Process loan disbursements' },
      { module: 'loans', resource: 'repayments', action: 'process', displayName: 'Process Repayments', description: 'Process loan repayments' },
      { module: 'loans', resource: 'restructure', action: 'process', displayName: 'Restructure Loans', description: 'Modify loan terms and conditions' },

      // Deposits & Savings
      { module: 'deposits', resource: 'savings', action: 'create', displayName: 'Open Savings Accounts', description: 'Open new savings accounts' },
      { module: 'deposits', resource: 'savings', action: 'read', displayName: 'View Savings Accounts', description: 'View savings account details' },
      { module: 'deposits', resource: 'savings', action: 'transact', displayName: 'Savings Transactions', description: 'Process deposits and withdrawals' },
      { module: 'deposits', resource: 'fixed', action: 'create', displayName: 'Create Fixed Deposits', description: 'Open fixed deposit accounts' },
      { module: 'deposits', resource: 'fixed', action: 'manage', displayName: 'Manage Fixed Deposits', description: 'Manage fixed deposit accounts' },

      // Budget Management
      { module: 'budget', resource: 'categories', action: 'create', displayName: 'Create Budget Categories', description: 'Create budget categories' },
      { module: 'budget', resource: 'categories', action: 'read', displayName: 'View Budget Categories', description: 'View budget categories' },
      { module: 'budget', resource: 'categories', action: 'update', displayName: 'Update Budget Categories', description: 'Modify budget categories' },
      { module: 'budget', resource: 'categories', action: 'delete', displayName: 'Delete Budget Categories', description: 'Remove budget categories' },
      { module: 'budget', resource: 'allocations', action: 'create', displayName: 'Create Budget Allocations', description: 'Allocate budget amounts' },
      { module: 'budget', resource: 'allocations', action: 'approve', displayName: 'Approve Budget Allocations', description: 'Approve budget allocations' },

      // Expenses Management
      { module: 'expenses', resource: 'requests', action: 'create', displayName: 'Create Expense Requests', description: 'Submit expense requests' },
      { module: 'expenses', resource: 'requests', action: 'read', displayName: 'View Expense Requests', description: 'View expense request details' },
      { module: 'expenses', resource: 'requests', action: 'approve', displayName: 'Approve Expenses', description: 'Approve expense requests' },
      { module: 'expenses', resource: 'requests', action: 'process', displayName: 'Process Expenses', description: 'Process approved expenses' },

      // Leave Management
      { module: 'leave', resource: 'requests', action: 'create', displayName: 'Create Leave Requests', description: 'Submit leave requests' },
      { module: 'leave', resource: 'requests', action: 'read', displayName: 'View Leave Requests', description: 'View leave request details' },
      { module: 'leave', resource: 'requests', action: 'approve', displayName: 'Approve Leave', description: 'Approve or reject leave requests' },

      // Organization Management
      { module: 'organization', resource: 'departments', action: 'create', displayName: 'Create Departments', description: 'Create organizational departments' },
      { module: 'organization', resource: 'departments', action: 'read', displayName: 'View Departments', description: 'View department information' },
      { module: 'organization', resource: 'departments', action: 'update', displayName: 'Update Departments', description: 'Modify department information' },
      { module: 'organization', resource: 'departments', action: 'delete', displayName: 'Delete Departments', description: 'Remove departments' },

      // Content Management
      { module: 'content', resource: 'documents', action: 'create', displayName: 'Create Documents', description: 'Upload and create documents' },
      { module: 'content', resource: 'documents', action: 'read', displayName: 'View Documents', description: 'View and download documents' },
      { module: 'content', resource: 'documents', action: 'update', displayName: 'Update Documents', description: 'Modify document information' },
      { module: 'content', resource: 'documents', action: 'delete', displayName: 'Delete Documents', description: 'Remove documents' },
      { module: 'content', resource: 'announcements', action: 'create', displayName: 'Create Announcements', description: 'Create announcements' },
      { module: 'content', resource: 'announcements', action: 'publish', displayName: 'Publish Announcements', description: 'Publish announcements' },

      // Day-End Operations
      { module: 'operations', resource: 'day_end', action: 'process', displayName: 'Process Day-End', description: 'Execute day-end operations' },
      { module: 'operations', resource: 'day_open', action: 'process', displayName: 'Process Day-Open', description: 'Execute day-open operations' },
      { module: 'operations', resource: 'cashbook', action: 'handover', displayName: 'Cashbook Handover', description: 'Process cashbook handovers' },

      // Branch Management
      { module: 'branches', resource: 'management', action: 'create', displayName: 'Create Branches', description: 'Create new branches' },
      { module: 'branches', resource: 'management', action: 'read', displayName: 'View Branches', description: 'View branch information' },
      { module: 'branches', resource: 'management', action: 'update', displayName: 'Update Branches', description: 'Modify branch information' },
      { module: 'branches', resource: 'data', action: 'consolidate', displayName: 'Consolidate Branch Data', description: 'Consolidate branch data' },

      // Communications (SMS) Management
      { module: 'communications', resource: 'sms', action: 'send', displayName: 'Send SMS', description: 'Send individual SMS messages' },
      { module: 'communications', resource: 'sms', action: 'viewhistory', displayName: 'View SMS History', description: 'View SMS message history and details' },
      { module: 'communications', resource: 'sms', action: 'viewstats', displayName: 'View SMS Statistics', description: 'View SMS usage statistics and reports' },
      { module: 'communications', resource: 'sms', action: 'view_history', displayName: 'View SMS History', description: 'View SMS message history and details' },
      { module: 'communications', resource: 'sms', action: 'view_stats', displayName: 'View SMS Statistics', description: 'View SMS usage statistics and reports' },
      { module: 'communications', resource: 'campaigns', action: 'create', displayName: 'Create SMS Campaigns', description: 'Create new SMS campaigns' },
      { module: 'communications', resource: 'campaigns', action: 'send', displayName: 'Send SMS Campaigns', description: 'Send and manage SMS campaigns' },
      { module: 'communications', resource: 'groups', action: 'manage', displayName: 'Manage Contact Groups', description: 'Create and manage SMS contact groups' },
      { module: 'communications', resource: 'groups', action: 'create', displayName: 'Create Contact Groups', description: 'Create new contact groups' },
      { module: 'communications', resource: 'groups', action: 'read', displayName: 'View Contact Groups', description: 'View contact groups and their details' },
      { module: 'communications', resource: 'groups', action: 'update', displayName: 'Update Contact Groups', description: 'Modify contact group information' },
      { module: 'communications', resource: 'groups', action: 'delete', displayName: 'Delete Contact Groups', description: 'Remove contact groups' },
      { module: 'communications', resource: 'groups', action: 'manage_members', displayName: 'Manage Group Members', description: 'Add and remove members from contact groups' },
      { module: 'communications', resource: 'balance', action: 'view', displayName: 'View SMS Balance', description: 'View SMS balance and usage' },
      { module: 'communications', resource: 'balance', action: 'manage', displayName: 'Manage SMS Balance', description: 'Update and manage SMS balance' },
      { module: 'communications', resource: 'templates', action: 'create', displayName: 'Create SMS Templates', description: 'Create reusable SMS templates' },
      { module: 'communications', resource: 'templates', action: 'manage', displayName: 'Manage SMS Templates', description: 'Edit and delete SMS templates' },

      // Member uploads and file management
      { module: 'members', resource: 'uploads', action: 'upload', displayName: 'Upload Member Files', description: 'Upload documents and files for members' },
      { module: 'members', resource: 'files', action: 'view', displayName: 'View Member Files', description: 'View member uploaded files' },
      { module: 'members', resource: 'files', action: 'delete', displayName: 'Delete Member Files', description: 'Delete member files' },
      { module: 'members', resource: 'documents', action: 'upload', displayName: 'Upload Member Documents', description: 'Upload member documents' },
      { module: 'members', resource: 'documents', action: 'download', displayName: 'Download Member Documents', description: 'Download member documents' },
      { module: 'members', resource: 'accounts', action: 'view_balance', displayName: 'View Account Balances', description: 'View member account balances' },
      { module: 'members', resource: 'accounts', action: 'view_transactions', displayName: 'View Account Transactions', description: 'View member account transaction history' },
      { module: 'members', resource: 'accounts', action: 'freeze', displayName: 'Freeze Accounts', description: 'Freeze member accounts' },
      { module: 'members', resource: 'accounts', action: 'unfreeze', displayName: 'Unfreeze Accounts', description: 'Unfreeze member accounts' },

      // Enhanced accounting permissions
      { module: 'accounting', resource: 'account_types', action: 'view', displayName: 'View Account Types', description: 'View account type configurations' },
      { module: 'accounting', resource: 'account_types', action: 'list', displayName: 'List Account Types', description: 'List all account types' },
      { module: 'accounting', resource: 'account_types', action: 'create', displayName: 'Create Account Types', description: 'Create new account types' },
      { module: 'accounting', resource: 'account_types', action: 'update', displayName: 'Update Account Types', description: 'Modify account types' },
      { module: 'accounting', resource: 'account_types', action: 'delete', displayName: 'Delete Account Types', description: 'Remove account types' },
      { module: 'accounting', resource: 'chart_of_accounts', action: 'view', displayName: 'View Chart of Accounts', description: 'View chart of accounts' },
      { module: 'accounting', resource: 'chart_of_accounts', action: 'manage', displayName: 'Manage Chart of Accounts', description: 'Create and modify chart of accounts' },

      // System file management
      { module: 'system', resource: 'files', action: 'upload', displayName: 'Upload Files', description: 'Upload files to the system' },
      { module: 'system', resource: 'files', action: 'download', displayName: 'Download Files', description: 'Download files from the system' },
      { module: 'system', resource: 'files', action: 'delete', displayName: 'Delete Files', description: 'Delete files from the system' },
      { module: 'system', resource: 'backup', action: 'create', displayName: 'Create Backups', description: 'Create system backups' },
      { module: 'system', resource: 'backup', action: 'restore', displayName: 'Restore Backups', description: 'Restore system from backups' },
      { module: 'system', resource: 'logs', action: 'view', displayName: 'View System Logs', description: 'View system logs and errors' },
      { module: 'system', resource: 'maintenance', action: 'execute', displayName: 'System Maintenance', description: 'Execute system maintenance tasks' },
      { module: 'system', resource: 'dashboard', action: 'view', displayName: 'View Dashboard', description: 'Access system dashboard' },

      // Document management
      { module: 'documents', resource: 'files', action: 'upload', displayName: 'Upload Documents', description: 'Upload document files' },
      { module: 'documents', resource: 'files', action: 'download', displayName: 'Download Documents', description: 'Download document files' },
      { module: 'documents', resource: 'files', action: 'view', displayName: 'View Documents', description: 'View document files' },
      { module: 'documents', resource: 'categories', action: 'manage', displayName: 'Manage Document Categories', description: 'Create and manage document categories' },

      // Reports
      { module: 'reports', resource: 'financial', action: 'generate', displayName: 'Generate Financial Reports', description: 'Generate financial reports' },
      { module: 'reports', resource: 'member', action: 'generate', displayName: 'Generate Member Reports', description: 'Generate member reports' },
      { module: 'reports', resource: 'custom', action: 'create', displayName: 'Create Custom Reports', description: 'Create custom reports' },

      // Notifications
      { module: 'notifications', resource: 'system', action: 'send', displayName: 'Send System Notifications', description: 'Send system notifications' },
      { module: 'notifications', resource: 'email', action: 'send', displayName: 'Send Email Notifications', description: 'Send email notifications' },
      { module: 'notifications', resource: 'settings', action: 'manage', displayName: 'Manage Notification Settings', description: 'Configure notification settings' }
    ];

    // Check for existing permissions and only insert new ones
    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT name FROM "Permissions"',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingPermissionNames = existingPermissions.map(p => p.name);

    const permissionRecords = permissions
      .filter(perm => !existingPermissionNames.includes(`${perm.module}.${perm.resource}.${perm.action}`))
      .map(perm => ({
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

    if (permissionRecords.length > 0) {
      await queryInterface.bulkInsert('Permissions', permissionRecords);
      console.log(`Inserted ${permissionRecords.length} new permissions`);
    } else {
      console.log('All permissions already exist, skipping insertion');
    }

    // Define system roles
    const roles = [
      {
        id: uuidv4(),
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        isSystemRole: true,
        level: 10,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'admin',
        displayName: 'Administrator',
        description: 'System administrator with most permissions',
        isSystemRole: true,
        level: 9,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'manager',
        displayName: 'Manager',
        description: 'Branch or department manager',
        isSystemRole: true,
        level: 7,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'loan_officer',
        displayName: 'Loan Officer',
        description: 'Handles loan applications and processing',
        isSystemRole: true,
        level: 5,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'accountant',
        displayName: 'Accountant',
        description: 'Handles accounting and financial operations',
        isSystemRole: true,
        level: 6,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'cashier',
        displayName: 'Cashier',
        description: 'Processes transactions and payments',
        isSystemRole: true,
        level: 4,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'clerk',
        displayName: 'Clerk',
        description: 'Basic data entry and customer service',
        isSystemRole: true,
        level: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'board_director',
        displayName: 'Board Director',
        description: 'Board member with oversight permissions',
        isSystemRole: true,
        level: 8,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Check for existing roles and only insert new ones
    const existingRoles = await queryInterface.sequelize.query(
      'SELECT name FROM "Roles"',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingRoleNames = existingRoles.map(r => r.name);

    const newRoles = roles.filter(role => !existingRoleNames.includes(role.name));

    if (newRoles.length > 0) {
      await queryInterface.bulkInsert('Roles', newRoles);
      console.log(`Inserted ${newRoles.length} new roles`);
    } else {
      console.log('All roles already exist, skipping insertion');
    }

    // Get inserted role and permission IDs for role-permission assignments
    const insertedRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Roles" WHERE "isSystemRole" = true',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const insertedPermissions = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Permissions" WHERE "isSystemPermission" = true',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Create role-permission mappings
    const rolePermissions = [];

    // Super Admin gets all permissions
    const superAdminRole = insertedRoles.find(r => r.name === 'super_admin');
    insertedPermissions.forEach(permission => {
      rolePermissions.push({
        id: uuidv4(),
        roleId: superAdminRole.id,
        permissionId: permission.id,
        grantedAt: now,
        createdAt: now,
        updatedAt: now
      });
    });

    // Admin gets most permissions (excluding some super admin only)
    const adminRole = insertedRoles.find(r => r.name === 'admin');
    const adminPermissions = insertedPermissions.filter(p => 
      !p.name.includes('system.roles.manage') && 
      !p.name.includes('system.permissions.manage')
    );
    adminPermissions.forEach(permission => {
      rolePermissions.push({
        id: uuidv4(),
        roleId: adminRole.id,
        permissionId: permission.id,
        grantedAt: now,
        createdAt: now,
        updatedAt: now
      });
    });

    // Manager permissions
    const managerRole = insertedRoles.find(r => r.name === 'manager');
    const managerPermissionNames = [
      'members.profile.read', 'members.profile.update', 'members.accounts.read',
      'accounting.transactions.read', 'accounting.reports.generate',
      'loans.applications.read', 'loans.applications.approve',
      'expenses.requests.read', 'expenses.requests.approve',
      'leave.requests.read', 'leave.requests.approve',
      'budget.categories.read', 'budget.allocations.approve',
      'organization.departments.read', 'organization.departments.update'
    ];
    managerPermissionNames.forEach(permName => {
      const permission = insertedPermissions.find(p => p.name === permName);
      if (permission) {
        rolePermissions.push({
          id: uuidv4(),
          roleId: managerRole.id,
          permissionId: permission.id,
          grantedAt: now,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Cashier permissions
    const cashierRole = insertedRoles.find(r => r.name === 'cashier');
    const cashierPermissionNames = [
      'members.profile.read', 'members.accounts.read',
      'accounting.transactions.create', 'accounting.transactions.read',
      'deposits.savings.transact', 'loans.repayments.process',
      'expenses.requests.process'
    ];
    cashierPermissionNames.forEach(permName => {
      const permission = insertedPermissions.find(p => p.name === permName);
      if (permission) {
        rolePermissions.push({
          id: uuidv4(),
          roleId: cashierRole.id,
          permissionId: permission.id,
          grantedAt: now,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Check for existing role-permission assignments
    const existingRolePermissions = await queryInterface.sequelize.query(
      'SELECT "roleId", "permissionId" FROM "RolePermissions"',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const existingAssignments = new Set(
      existingRolePermissions.map(rp => `${rp.roleId}-${rp.permissionId}`)
    );

    // Filter out existing assignments
    const newRolePermissions = rolePermissions.filter(rp => 
      !existingAssignments.has(`${rp.roleId}-${rp.permissionId}`)
    );

    if (newRolePermissions.length > 0) {
      await queryInterface.bulkInsert('RolePermissions', newRolePermissions);
      console.log(`Inserted ${newRolePermissions.length} new role-permission assignments`);
    } else {
      console.log('All role-permission assignments already exist, skipping insertion');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('RolePermissions', null, {});
    await queryInterface.bulkDelete('UserRoles', null, {});
    await queryInterface.bulkDelete('Permissions', null, {});
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
