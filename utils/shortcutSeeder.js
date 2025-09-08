/**
 * Shortcut Seeder - Creates default system shortcuts
 */

const { Shortcut } = require('../models');

const defaultShortcuts = [
  // Global Shortcuts (000-099)
  {
    code: '001',
    name: 'Dashboard',
    description: 'Navigate to main dashboard',
    module: 'global',
    actionType: 'navigation',
    actionData: { target: '/dashboard' },
    category: 'navigation',
    icon: 'dashboard',
    isSystem: true
  },
  {
    code: '010',
    name: 'Search Members',
    description: 'Open member search interface',
    module: 'global',
    actionType: 'modal',
    actionData: { component: 'MemberSearchDialog' },
    category: 'search',
    icon: 'search',
    isSystem: true
  },
  {
    code: '020',
    name: 'Quick Reports',
    description: 'Access quick reports menu',
    module: 'global',
    actionType: 'navigation',
    actionData: { target: '/dashboard/reports' },
    category: 'reports',
    icon: 'chart-bar',
    isSystem: true
  },
  {
    code: '099',
    name: 'System Settings',
    description: 'Access system settings',
    module: 'global',
    actionType: 'navigation',
    actionData: { target: '/dashboard/settings' },
    category: 'system',
    icon: 'cog',
    requiredRoles: ['admin', 'super_admin'],
    isSystem: true
  },

  // Member Management (100-199)
  {
    code: '101',
    name: 'New Member Registration',
    description: 'Create new member account',
    module: 'members',
    actionType: 'navigation',
    actionData: { target: '/dashboard/members/new' },
    category: 'members',
    icon: 'user-plus',
    requiredRoles: ['admin', 'super_admin', 'manager', 'clerk'],
    isSystem: true
  },
  {
    code: '102',
    name: 'Member Search',
    description: 'Search existing members',
    module: 'members',
    actionType: 'navigation',
    actionData: { target: '/dashboard/members' },
    category: 'members',
    icon: 'users',
    isSystem: true
  },
  {
    code: '103',
    name: 'Member Profile',
    description: 'View member profile details',
    module: 'members',
    actionType: 'modal',
    actionData: { component: 'MemberProfileDialog' },
    category: 'members',
    icon: 'user',
    isSystem: true
  },
  {
    code: '110',
    name: 'Member Statement',
    description: 'Generate member account statement',
    module: 'members',
    actionType: 'modal',
    actionData: { component: 'MemberStatementDialog' },
    category: 'reports',
    icon: 'document-text',
    isSystem: true
  },

  // Loan Operations (200-299)
  {
    code: '201',
    name: 'New Loan Application',
    description: 'Create new loan application',
    module: 'loans',
    actionType: 'navigation',
    actionData: { target: '/dashboard/loans/new' },
    category: 'loans',
    icon: 'currency-dollar',
    requiredRoles: ['admin', 'super_admin', 'manager', 'loan_officer'],
    isSystem: true
  },
  {
    code: '202',
    name: 'Loan Approval Queue',
    description: 'View pending loan approvals',
    module: 'loans',
    actionType: 'navigation',
    actionData: { target: '/dashboard/loans/approvals' },
    category: 'loans',
    icon: 'check-circle',
    requiredRoles: ['admin', 'super_admin', 'manager', 'loan_officer', 'loan_board'],
    isSystem: true
  },
  {
    code: '203',
    name: 'Loan Disbursement',
    description: 'Process loan disbursement',
    module: 'loans',
    actionType: 'navigation',
    actionData: { target: '/dashboard/loans/disbursement' },
    category: 'loans',
    icon: 'cash',
    requiredRoles: ['admin', 'super_admin', 'manager', 'cashier'],
    isSystem: true
  },
  {
    code: '210',
    name: 'Loan Repayment',
    description: 'Process loan repayment',
    module: 'loans',
    actionType: 'modal',
    actionData: { component: 'LoanRepaymentDialog' },
    category: 'loans',
    icon: 'credit-card',
    requiredRoles: ['admin', 'super_admin', 'manager', 'cashier', 'clerk'],
    isSystem: true
  },
  {
    code: '220',
    name: 'Loan Calculator',
    description: 'Open loan calculator tool',
    module: 'loans',
    actionType: 'modal',
    actionData: { component: 'LoanCalculatorDialog' },
    category: 'tools',
    icon: 'calculator',
    isSystem: true
  },

  // Accounting (300-399)
  {
    code: '301',
    name: 'New Transaction',
    description: 'Create new financial transaction',
    module: 'accounting',
    actionType: 'navigation',
    actionData: { target: '/dashboard/accounting/transactions/new' },
    category: 'accounting',
    icon: 'plus-circle',
    requiredRoles: ['admin', 'super_admin', 'manager', 'accountant', 'cashier'],
    isSystem: true
  },
  {
    code: '302',
    name: 'Journal Entry',
    description: 'Create journal entry',
    module: 'accounting',
    actionType: 'modal',
    actionData: { component: 'JournalEntryDialog' },
    category: 'accounting',
    icon: 'book-open',
    requiredRoles: ['admin', 'super_admin', 'accountant'],
    isSystem: true
  },
  {
    code: '303',
    name: 'Account Balance',
    description: 'View account balances',
    module: 'accounting',
    actionType: 'navigation',
    actionData: { target: '/dashboard/accounting/balances' },
    category: 'accounting',
    icon: 'scale',
    requiredRoles: ['admin', 'super_admin', 'manager', 'accountant'],
    isSystem: true
  },
  {
    code: '310',
    name: 'Day-End Process',
    description: 'Initiate day-end operations',
    module: 'accounting',
    actionType: 'modal',
    actionData: { component: 'DayEndDialog' },
    category: 'operations',
    icon: 'moon',
    requiredRoles: ['admin', 'super_admin', 'manager'],
    isSystem: true
  },
  {
    code: '320',
    name: 'Financial Reports',
    description: 'Generate financial reports',
    module: 'accounting',
    actionType: 'navigation',
    actionData: { target: '/dashboard/reports/financial' },
    category: 'reports',
    icon: 'chart-line',
    requiredRoles: ['admin', 'super_admin', 'manager', 'accountant'],
    isSystem: true
  },

  // System Operations (900-999)
  {
    code: '901',
    name: 'User Management',
    description: 'Manage system users',
    module: 'system',
    actionType: 'navigation',
    actionData: { target: '/dashboard/users' },
    category: 'administration',
    icon: 'users-cog',
    requiredRoles: ['admin', 'super_admin'],
    isSystem: true
  },
  {
    code: '902',
    name: 'System Backup',
    description: 'Initiate system backup',
    module: 'system',
    actionType: 'modal',
    actionData: { component: 'BackupDialog' },
    category: 'administration',
    icon: 'database',
    requiredRoles: ['super_admin'],
    isSystem: true
  },
  {
    code: '903',
    name: 'Audit Logs',
    description: 'View system audit logs',
    module: 'system',
    actionType: 'navigation',
    actionData: { target: '/dashboard/audit-logs' },
    category: 'administration',
    icon: 'clipboard-list',
    requiredRoles: ['admin', 'super_admin'],
    isSystem: true
  },
  {
    code: '999',
    name: 'Emergency Logout',
    description: 'Force logout all sessions',
    module: 'system',
    actionType: 'api_call',
    actionData: { 
      endpoint: '/auth/emergency-logout',
      method: 'POST',
      confirm: true,
      message: 'This will log out all users. Continue?'
    },
    category: 'emergency',
    icon: 'exclamation-triangle',
    requiredRoles: ['super_admin'],
    isSystem: true
  }
];

/**
 * Seed default shortcuts
 */
async function seedShortcuts() {
  try {
    console.log('🚀 Seeding default shortcuts...');

    for (const shortcutData of defaultShortcuts) {
      const [shortcut, created] = await Shortcut.findOrCreate({
        where: { code: shortcutData.code },
        defaults: shortcutData
      });

      if (created) {
        console.log(`✅ Created shortcut: ${shortcutData.code} - ${shortcutData.name}`);
      } else {
        console.log(`⏭️  Shortcut already exists: ${shortcutData.code} - ${shortcutData.name}`);
      }
    }

    console.log('🎉 Shortcut seeding completed!');
    return true;

  } catch (error) {
    console.error('❌ Error seeding shortcuts:', error);
    return false;
  }
}

module.exports = {
  seedShortcuts,
  defaultShortcuts
};
