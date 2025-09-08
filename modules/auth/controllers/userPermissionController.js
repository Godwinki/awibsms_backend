const { getUserPermissions } = require('../middleware/permissionMiddleware');
const { User, Role, Permission, UserRole } = require('../../../models');

const userPermissionController = {
  // Get current user's permissions
  async getMyPermissions(req, res) {
    try {
      const userId = req.user.id;
      const userPermissions = await getUserPermissions(userId);

      res.status(200).json({
        success: true,
        data: userPermissions
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user permissions',
        error: error.message
      });
    }
  },

  // Get specific user's permissions (admin only)
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const userPermissions = await getUserPermissions(userId);

      res.status(200).json({
        success: true,
        data: userPermissions
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user permissions',
        error: error.message
      });
    }
  },

  // Get user's roles
  async getUserRoles(req, res) {
    try {
      const { userId } = req.params;

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
          attributes: ['id', 'name', 'displayName', 'description', 'level']
        }, {
          model: User,
          as: 'assignor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['assignedAt', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: userRoles
      });
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user roles',
        error: error.message
      });
    }
  },

  // Check if user has specific permission
  async checkPermission(req, res) {
    try {
      const { userId } = req.params;
      const { permission } = req.query;

      if (!permission) {
        return res.status(400).json({
          success: false,
          message: 'Permission parameter is required'
        });
      }

      const userPermissions = await getUserPermissions(userId);
      const hasPermission = userPermissions.permissions.some(p => p.name === permission);

      res.status(200).json({
        success: true,
        data: {
          userId,
          permission,
          hasPermission
        }
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: error.message
      });
    }
  }
};

module.exports = userPermissionController;
