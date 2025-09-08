/**
 * Auth Module Routes
 */

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const userPermissionRoutes = require('./userPermissionRoutes');
const twoFactorRoutes = require('./twoFactorRoutes');
const unlockRoutes = require('./unlockRoutes');
const superAdminRoutes = require('./superAdminRoutes');

module.exports = {
  authRoutes,
  userRoutes,
  userPermissionRoutes,
  twoFactorRoutes,
  unlockRoutes,
  superAdminRoutes
};
