const { Permission, Role, RolePermission } = require('../../../models');
const { Op } = require('sequelize');

const permissionController = {
  // Get all permissions
  async getPermissions(req, res) {
    try {
      const { module, resource, action, includeRoles = false } = req.query;
      
      const whereClause = {};
      if (module) whereClause.module = module;
      if (resource) whereClause.resource = resource;
      if (action) whereClause.action = action;

      const includeOptions = [];
      if (includeRoles === 'true') {
        includeOptions.push({
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'displayName']
        });
      }

      const permissions = await Permission.findAll({
        where: whereClause,
        include: includeOptions,
        order: [['module', 'ASC'], ['resource', 'ASC'], ['action', 'ASC']]
      });

      // Group permissions by module for better organization
      const groupedPermissions = permissions.reduce((acc, permission) => {
        const module = permission.module;
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permissions',
        error: error.message
      });
    }
  },

  // Get single permission
  async getPermission(req, res) {
    try {
      const { id } = req.params;
      
      const permission = await Permission.findByPk(id, {
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: ['grantedAt', 'grantedBy'] },
          attributes: ['id', 'name', 'displayName', 'level']
        }]
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      res.status(200).json({
        success: true,
        data: permission
      });
    } catch (error) {
      console.error('Error fetching permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permission',
        error: error.message
      });
    }
  },

  // Create new permission
  async createPermission(req, res) {
    try {
      const { module, resource, action, displayName, description } = req.body;
      
      const name = `${module}.${resource}.${action}`;
      
      // Check if permission already exists
      const existingPermission = await Permission.findOne({ where: { name } });
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: 'Permission already exists'
        });
      }

      const permission = await Permission.create({
        name,
        displayName,
        description,
        module,
        resource,
        action,
        isSystemPermission: false
      });

      res.status(201).json({
        success: true,
        data: permission,
        message: 'Permission created successfully'
      });
    } catch (error) {
      console.error('Error creating permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create permission',
        error: error.message
      });
    }
  },

  // Update permission
  async updatePermission(req, res) {
    try {
      const { id } = req.params;
      const { displayName, description } = req.body;

      const permission = await Permission.findByPk(id);
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      // Prevent modification of system permissions' core properties
      if (permission.isSystemPermission) {
        // Only allow updating display name and description for system permissions
        await permission.update({ displayName, description });
      } else {
        // Allow full update for custom permissions
        const { module, resource, action } = req.body;
        const name = `${module}.${resource}.${action}`;
        
        await permission.update({
          name,
          displayName,
          description,
          module,
          resource,
          action
        });
      }

      res.status(200).json({
        success: true,
        data: permission,
        message: 'Permission updated successfully'
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permission',
        error: error.message
      });
    }
  },

  // Delete permission
  async deletePermission(req, res) {
    try {
      const { id } = req.params;

      const permission = await Permission.findByPk(id);
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      // Prevent deletion of system permissions
      if (permission.isSystemPermission) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete system permission'
        });
      }

      // Check if permission is assigned to any roles
      const roleCount = await RolePermission.count({ where: { permissionId: id } });
      if (roleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete permission. It is assigned to ${roleCount} role(s)`
        });
      }

      await permission.destroy();

      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete permission',
        error: error.message
      });
    }
  },

  // Get permission matrix (roles vs permissions)
  async getPermissionMatrix(req, res) {
    try {
      const roles = await Role.findAll({
        where: { isActive: true },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }],
        order: [['level', 'DESC']]
      });

      const permissions = await Permission.findAll({
        order: [['module', 'ASC'], ['resource', 'ASC'], ['action', 'ASC']]
      });

      // Create matrix
      const matrix = roles.map(role => ({
        role: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          level: role.level
        },
        permissions: permissions.map(permission => ({
          permission: {
            id: permission.id,
            name: permission.name,
            displayName: permission.displayName,
            module: permission.module
          },
          hasPermission: role.permissions.some(p => p.id === permission.id)
        }))
      }));

      res.status(200).json({
        success: true,
        data: {
          matrix,
          roles: roles.map(r => ({ id: r.id, name: r.name, displayName: r.displayName })),
          permissions: permissions.map(p => ({ 
            id: p.id, 
            name: p.name, 
            displayName: p.displayName, 
            module: p.module 
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permission matrix',
        error: error.message
      });
    }
  },

  // Get modules and their resources
  async getModuleStructure(req, res) {
    try {
      const permissions = await Permission.findAll({
        attributes: ['module', 'resource', 'action'],
        order: [['module', 'ASC'], ['resource', 'ASC'], ['action', 'ASC']]
      });

      const structure = permissions.reduce((acc, permission) => {
        const { module, resource, action } = permission;
        
        if (!acc[module]) {
          acc[module] = {};
        }
        
        if (!acc[module][resource]) {
          acc[module][resource] = [];
        }
        
        if (!acc[module][resource].includes(action)) {
          acc[module][resource].push(action);
        }
        
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: structure
      });
    } catch (error) {
      console.error('Error fetching module structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch module structure',
        error: error.message
      });
    }
  },

  // Get permissions for a specific role
  async getRolePermissions(req, res) {
    try {
      const { roleId } = req.params;

      const rolePermissions = await RolePermission.findAll({
        where: { roleId },
        include: [{
          model: Permission,
          as: 'permission',
          attributes: ['id', 'name', 'displayName', 'description', 'module', 'resource', 'action']
        }],
        order: [['grantedAt', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: rolePermissions
      });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role permissions',
        error: error.message
      });
    }
  },

  // Assign permission to role
  async assignPermissionToRole(req, res) {
    try {
      const { roleId } = req.params;
      const { permissionId } = req.body;

      if (!permissionId) {
        return res.status(400).json({
          success: false,
          message: 'Permission ID is required'
        });
      }

      // Check if role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if permission exists
      const permission = await Permission.findByPk(permissionId);
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      // Check if assignment already exists
      const existingAssignment = await RolePermission.findOne({
        where: { roleId, permissionId }
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: 'Permission already assigned to this role'
        });
      }

      // Create the assignment
      const rolePermission = await RolePermission.create({
        roleId,
        permissionId,
        grantedBy: req.user.id,
        grantedAt: new Date()
      });

      res.status(201).json({
        success: true,
        data: rolePermission,
        message: 'Permission assigned to role successfully'
      });
    } catch (error) {
      console.error('Error assigning permission to role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign permission to role',
        error: error.message
      });
    }
  },

  // Remove permission from role
  async removePermissionFromRole(req, res) {
    try {
      const { roleId, permissionId } = req.params;

      const rolePermission = await RolePermission.findOne({
        where: { roleId, permissionId }
      });

      if (!rolePermission) {
        return res.status(404).json({
          success: false,
          message: 'Permission assignment not found'
        });
      }

      await rolePermission.destroy();

      res.status(200).json({
        success: true,
        message: 'Permission removed from role successfully'
      });
    } catch (error) {
      console.error('Error removing permission from role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove permission from role',
        error: error.message
      });
    }
  }
};

module.exports = permissionController;
