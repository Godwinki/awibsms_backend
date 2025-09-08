const { User, Role, Permission, UserRole, RolePermission } = require('../../../models');

/**
 * Enhanced permission middleware for granular access control
 * Supports both legacy role-based and new permission-based authorization
 */

/**
 * Check if user has specific permission
 * @param {string} permissionName - Format: module.resource.action
 */
exports.requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // First check: Get user's primary role from Users table
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: '🚫 User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      // Check primary role permissions
      const primaryRole = await Role.findOne({
        where: { name: user.role, isActive: true },
        include: [{
          model: Permission,
          as: 'permissions',
          where: { name: permissionName },
          required: false
        }]
      });

      let hasPermission = primaryRole && primaryRole.permissions.length > 0;

      // If not found in primary role, check explicit role assignments
      if (!hasPermission) {
        const userRoles = await UserRole.findAll({
          where: { 
            userId, 
            isActive: true,
            [require('sequelize').Op.or]: [
              { expiresAt: null },
              { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
            ]
          },
          include: [{
            model: Role,
            as: 'role',
            where: { isActive: true },
            include: [{
              model: Permission,
              as: 'permissions',
              where: { name: permissionName },
              required: false
            }]
          }]
        });

        // Check if user has the required permission through any of their roles
        hasPermission = userRoles.some(userRole => 
          userRole.role.permissions.some(permission => permission.name === permissionName)
        );
      }

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: `🚫 Insufficient permissions. Required: ${permissionName}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        status: 'error',
        message: '🔥 Internal server error in permission check'
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {string[]} permissionNames - Array of permission names
 */
exports.requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // First check: Get user's primary role from Users table
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: '🚫 User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      // Check primary role permissions
      const primaryRole = await Role.findOne({
        where: { name: user.role, isActive: true },
        include: [{
          model: Permission,
          as: 'permissions',
          where: { name: { [require('sequelize').Op.in]: permissionNames } },
          required: false
        }]
      });

      let hasAnyPermission = primaryRole && primaryRole.permissions.length > 0;

      // If not found in primary role, check explicit role assignments
      if (!hasAnyPermission) {
        const userRoles = await UserRole.findAll({
          where: { 
            userId, 
            isActive: true,
            [require('sequelize').Op.or]: [
              { expiresAt: null },
              { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
            ]
          },
          include: [{
            model: Role,
            as: 'role',
            where: { isActive: true },
            include: [{
              model: Permission,
              as: 'permissions',
              where: { name: { [require('sequelize').Op.in]: permissionNames } },
              required: false
            }]
          }]
        });

        hasAnyPermission = userRoles.some(userRole => 
          userRole.role.permissions.some(permission => 
            permissionNames.includes(permission.name)
          )
        );
      }

      if (!hasAnyPermission) {
        return res.status(403).json({
          status: 'error',
          message: `🚫 Insufficient permissions. Required one of: ${permissionNames.join(', ')}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        status: 'error',
        message: '🔥 Internal server error in permission check'
      });
    }
  };
};

/**
 * Check if user has all specified permissions
 * @param {string[]} permissionNames - Array of permission names
 */
exports.requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      const userRoles = await UserRole.findAll({
        where: { 
          userId, 
          isActive: true,
          [require('sequelize').Op.or]: [
            { expiresAt: null },
            { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
          ]
        },
        include: [{
          model: Role,
          as: 'role',
          where: { isActive: true },
          include: [{
            model: Permission,
            as: 'permissions',
            required: false
          }]
        }]
      });

      // Get all permissions user has
      const userPermissions = [];
      userRoles.forEach(userRole => {
        userRole.role.permissions.forEach(permission => {
          if (!userPermissions.includes(permission.name)) {
            userPermissions.push(permission.name);
          }
        });
      });

      // Check if user has all required permissions
      const hasAllPermissions = permissionNames.every(permName => 
        userPermissions.includes(permName)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissionNames.filter(permName => 
          !userPermissions.includes(permName)
        );
        return res.status(403).json({
          status: 'error',
          message: `🚫 Missing permissions: ${missingPermissions.join(', ')}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        status: 'error',
        message: '🔥 Internal server error in permission check'
      });
    }
  };
};

/**
 * Backward compatibility: Check legacy roles
 * @param {...string} roles - Legacy role names
 */
exports.requireLegacyRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: '🚫 You do not have permission to perform this action',
        code: 'ROLE_DENIED'
      });
    }
    next();
  };
};

/**
 * Get user's effective permissions (for frontend use)
 */
exports.getUserPermissions = async (userId) => {
  try {
    const userRoles = await UserRole.findAll({
      where: { 
        userId, 
        isActive: true,
        [require('sequelize').Op.or]: [
          { expiresAt: null },
          { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
        ]
      },
      include: [{
        model: Role,
        as: 'role',
        where: { isActive: true },
        include: [{
          model: Permission,
          as: 'permissions'
        }]
      }]
    });

    const permissions = [];
    const roles = [];

    userRoles.forEach(userRole => {
      roles.push({
        id: userRole.role.id,
        name: userRole.role.name,
        displayName: userRole.role.displayName,
        level: userRole.role.level
      });

      userRole.role.permissions.forEach(permission => {
        if (!permissions.find(p => p.name === permission.name)) {
          permissions.push({
            name: permission.name,
            displayName: permission.displayName,
            module: permission.module,
            resource: permission.resource,
            action: permission.action
          });
        }
      });
    });

    return { roles, permissions };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    throw error;
  }
};
