const { sequelize, Sequelize } = require("../core/database/database");

// Helper function to safely import models
const safeImport = (modulePath, moduleName) => {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(` Could not import ${moduleName} models:`, error.message);
    return {};
  }
};

// Import models from all modules
const authModels = safeImport("../modules/auth/models", "auth");
const memberModels = safeImport("../modules/members/models", "members");
const budgetModels = safeImport("../modules/budget/models", "budget");
const accountingModels = safeImport("../modules/accounting/models", "accounting");
const expenseModels = safeImport("../modules/expenses/models", "expenses");
const organizationModels = safeImport("../modules/organization/models", "organization");
const contentModels = safeImport("../modules/content/models", "content");
const notificationModels = safeImport("../modules/notifications/models", "notifications");
const systemModels = safeImport("../modules/system/models", "system");
const leaveModels = safeImport("../modules/leave/models", "leave");
const paymentModels = safeImport("../modules/payments/models", "payments");
const documentModels = safeImport("../modules/documents/models", "documents");
const communicationModels = safeImport("../modules/communications/models", "communications");
const companyModels = safeImport("../modules/company/models", "company");
const branchModels = safeImport("../modules/branches/models", "branches");

// Import standalone models
const AccountUnlockLog = require('./AccountUnlockLog')(sequelize);
const ActiveSession = require('./ActiveSession')(sequelize);

// Combine all models
const models = {
  ...authModels,
  ...memberModels,
  ...budgetModels,
  ...accountingModels,
  ...expenseModels,
  ...organizationModels,
  ...contentModels,
  ...notificationModels,
  ...systemModels,
  ...leaveModels,
  ...paymentModels,
  ...documentModels,
  ...communicationModels,
  ...companyModels,
  ...branchModels,
  // Add standalone models
  AccountUnlockLog,
  ActiveSession
};

// Initialize associations for all models
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export everything needed
module.exports = {
  ...models,
  sequelize,
  Sequelize
};
