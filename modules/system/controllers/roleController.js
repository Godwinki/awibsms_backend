const { Role, Permission, RolePermission, UserRole, User } = require('../../../models');
const { Op } = require('sequelize');

const roleController = {
  // Get all roles
  async getRoles(req, res) {
    try {
      const { includePermissions = false, includeUsers = false } = req.query;
      
      const includeOptions = [];
      
      if (includePermissions === 'true') {
        includeOptions.push({
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        });
      }
      
      if (includeUsers === 'true') {
        includeOptions.push({
          model: User,
          as: 'users',
          through: { attributes: ['assignedAt', 'isActive'] },
          attributes: ['id', 'firstName', 'lastName', 'email']
        });
      }

      const roles = await Role.findAll({
        include: includeOptions,
        order: [['level', 'DESC'], ['name', 'ASC']]
      });

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
        error: error.message
      });
    }
  },

  // Get single role
  async getRole(req, res) {
    try {
      const { id } = req.params;
      
      const role = await Role.findByPk(id, {
        include: [
          {
            model: Permission,
            as: 'permissions',
            through: { attributes: ['grantedAt', 'grantedBy'] }
          },
          {
            model: User,
            as: 'users',
            through: { attributes: ['assignedAt', 'assignedBy', 'isActive'] },
            attributes: ['id', 'firstName', 'lastName', 'email', 'status']
          }
        ]
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role',
        error: error.message
      });
    }
  },

  // Create new role
  async createRole(req, res) {
    try {
      const { name, displayName, description, level = 1, permissionIds = [] } = req.body;
      
      // Check if role name already exists
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role name already exists'
        });
      }

      // Create role
      const role = await Role.create({
        name,
        displayName,
        description,
        level,
        isSystemRole: false
      });

      // Assign permissions if provided
      if (permissionIds.length > 0) {
        const permissions = await Permission.findAll({
          where: { id: { [Op.in]: permissionIds } }
        });

        const rolePermissions = permissions.map(permission => ({
          roleId: role.id,
          permissionId: permission.id,
          grantedBy: req.user.id
        }));

        await RolePermission.bulkCreate(rolePermissions);
      }

      // Fetch created role with permissions
      const createdRole = await Role.findByPk(role.id, {
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      });

      res.status(201).json({
        success: true,
        data: createdRole,
        message: 'Role created successfully'
      });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message
      });
    }
  },

  // Update role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, displayName, description, level, isActive, permissionIds } = req.body;

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modification of system roles' core properties
      if (role.isSystemRole && (name !== role.name)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify system role name'
        });
      }

      // Update role properties
      await role.update({
        name: role.isSystemRole ? role.name : name,
        displayName,
        description,
        level,
        isActive
      });

      // Update permissions if provided
      if (Array.isArray(permissionIds)) {
        // Remove existing permissions
        await RolePermission.destroy({ where: { roleId: id } });

        // Add new permissions
        if (permissionIds.length > 0) {
          const permissions = await Permission.findAll({
            where: { id: { [Op.in]: permissionIds } }
          });

          const rolePermissions = permissions.map(permission => ({
            roleId: id,
            permissionId: permission.id,
            grantedBy: req.user.id
          }));

          await RolePermission.bulkCreate(rolePermissions);
        }
      }

      // Fetch updated role with permissions
      const updatedRole = await Role.findByPk(id, {
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      });

      res.status(200).json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: error.message
      });
    }
  },

  // Delete role
  async deleteRole(req, res) {
    try {
      const { id } = req.params;

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent deletion of system roles
      if (role.isSystemRole) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete system role'
        });
      }

      // Check if role is assigned to any users
      const userCount = await UserRole.count({ where: { roleId: id, isActive: true } });
      if (userCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role. It is assigned to ${userCount} user(s)`
        });
      }

      await role.destroy();

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: error.message
      });
    }
  },

  // Assign role to user
  async assignRoleToUser(req, res) {
    try {
      const { roleId, userId, expiresAt } = req.body;

      // Check if role and user exist
      const [role, user] = await Promise.all([
        Role.findByPk(roleId),
        User.findByPk(userId)
      ]);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if assignment already exists
      const existingAssignment = await UserRole.findOne({
        where: { userId, roleId, isActive: true }
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: 'User already has this role'
        });
      }

      // Create role assignment
      const userRole = await UserRole.create({
        userId,
        roleId,
        assignedBy: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      });

      res.status(201).json({
        success: true,
        data: userRole,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: error.message
      });
    }
  },

  // Remove role from user
  async removeRoleFromUser(req, res) {
    try {
      const { userId, roleId } = req.params;

      const userRole = await UserRole.findOne({
        where: { userId, roleId, isActive: true }
      });

      if (!userRole) {
        return res.status(404).json({
          success: false,
          message: 'Role assignment not found'
        });
      }

      await userRole.update({ isActive: false });

      res.status(200).json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove role',
        error: error.message
      });
    }
  }
};

module.exports = roleController;
