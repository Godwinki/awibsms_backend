/**
 * Shortcut Controller - Quick Actions System
 */

const { Shortcut, UserShortcut } = require('../models');
const { User } = require('../../auth/models');
const { Op } = require('sequelize');

/**
 * Get all shortcuts available to the current user
 */
exports.getShortcuts = async (req, res) => {
  try {
    const { module, category, search } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    const whereConditions = {
      isActive: true
    };

    if (module && module !== 'all') {
      whereConditions.module = module;
    }

    if (category && category !== 'all') {
      whereConditions.category = category;
    }

    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get shortcuts with user customizations
    const shortcuts = await Shortcut.findAll({
      where: whereConditions,
      include: [
        {
          model: UserShortcut,
          as: 'userCustomizations',
          where: { userId },
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['code', 'ASC']]
    });

    // Filter shortcuts based on user permissions and roles
    const filteredShortcuts = shortcuts.filter(shortcut => {
      // Check role requirements
      if (shortcut.requiredRoles && shortcut.requiredRoles.length > 0) {
        if (!shortcut.requiredRoles.includes(userRole)) {
          return false;
        }
      }

      // TODO: Add permission checks when permission system is fully integrated
      // if (shortcut.requiredPermissions && shortcut.requiredPermissions.length > 0) {
      //   return hasUserPermissions(userId, shortcut.requiredPermissions);
      // }

      return true;
    });

    // Transform data to include user customizations
    const result = filteredShortcuts.map(shortcut => {
      const userCustomization = shortcut.userCustomizations?.[0];
      
      return {
        id: shortcut.id,
        code: userCustomization?.customCode || shortcut.code,
        originalCode: shortcut.code,
        name: shortcut.name,
        description: shortcut.description,
        module: shortcut.module,
        actionType: shortcut.actionType,
        actionData: shortcut.actionData,
        category: shortcut.category,
        icon: shortcut.icon,
        isSystem: shortcut.isSystem,
        isFavorite: userCustomization?.isFavorite || false,
        usageCount: userCustomization?.usageCount || 0,
        lastUsedAt: userCustomization?.lastUsedAt,
        isEnabled: userCustomization?.isEnabled !== false,
        creator: shortcut.creator
      };
    });

    res.json({
      status: 'success',
      data: {
        shortcuts: result,
        total: result.length
      }
    });

  } catch (error) {
    console.error('Error fetching shortcuts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch shortcuts'
    });
  }
};

/**
 * Execute a shortcut by code
 */
exports.executeShortcut = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find shortcut by code or user's custom code
    let shortcut = await Shortcut.findOne({
      where: { code, isActive: true },
      include: [
        {
          model: UserShortcut,
          as: 'userCustomizations',
          where: { userId },
          required: false
        }
      ]
    });

    // If not found by original code, check user's custom codes
    if (!shortcut) {
      const userShortcut = await UserShortcut.findOne({
        where: { userId, customCode: code },
        include: [
          {
            model: Shortcut,
            as: 'shortcut',
            where: { isActive: true }
          }
        ]
      });

      if (userShortcut) {
        shortcut = userShortcut.shortcut;
      }
    }

    if (!shortcut) {
      return res.status(404).json({
        status: 'error',
        message: 'Shortcut not found or inactive'
      });
    }

    // Check role requirements
    if (shortcut.requiredRoles && shortcut.requiredRoles.length > 0) {
      if (!shortcut.requiredRoles.includes(userRole)) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to execute this shortcut'
        });
      }
    }

    // Update usage statistics
    await UserShortcut.upsert({
      userId,
      shortcutId: shortcut.id,
      usageCount: (shortcut.userCustomizations?.[0]?.usageCount || 0) + 1,
      lastUsedAt: new Date()
    });

    // Return shortcut execution data
    res.json({
      status: 'success',
      data: {
        shortcut: {
          id: shortcut.id,
          code: shortcut.code,
          name: shortcut.name,
          actionType: shortcut.actionType,
          actionData: shortcut.actionData,
          module: shortcut.module
        }
      }
    });

  } catch (error) {
    console.error('Error executing shortcut:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute shortcut'
    });
  }
};

/**
 * Create a new shortcut (admin only)
 */
exports.createShortcut = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      module,
      actionType,
      actionData,
      requiredPermissions,
      requiredRoles,
      category,
      icon
    } = req.body;

    const shortcut = await Shortcut.create({
      code,
      name,
      description,
      module: module || 'global',
      actionType,
      actionData,
      requiredPermissions: requiredPermissions || [],
      requiredRoles: requiredRoles || [],
      category: category || 'general',
      icon,
      createdBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: { shortcut }
    });

  } catch (error) {
    console.error('Error creating shortcut:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status: 'error',
        message: 'Shortcut code already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create shortcut'
    });
  }
};

/**
 * Update shortcut (admin only)
 */
exports.updateShortcut = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const shortcut = await Shortcut.findByPk(id);
    if (!shortcut) {
      return res.status(404).json({
        status: 'error',
        message: 'Shortcut not found'
      });
    }

    // Prevent updating system shortcuts
    if (shortcut.isSystem && !req.user.role === 'super_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot modify system shortcuts'
      });
    }

    await shortcut.update(updateData);

    res.json({
      status: 'success',
      data: { shortcut }
    });

  } catch (error) {
    console.error('Error updating shortcut:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update shortcut'
    });
  }
};

/**
 * Delete shortcut (admin only)
 */
exports.deleteShortcut = async (req, res) => {
  try {
    const { id } = req.params;

    const shortcut = await Shortcut.findByPk(id);
    if (!shortcut) {
      return res.status(404).json({
        status: 'error',
        message: 'Shortcut not found'
      });
    }

    // Prevent deleting system shortcuts
    if (shortcut.isSystem) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete system shortcuts'
      });
    }

    await shortcut.destroy();

    res.json({
      status: 'success',
      message: 'Shortcut deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting shortcut:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete shortcut'
    });
  }
};

/**
 * Toggle favorite shortcut for user
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const shortcut = await Shortcut.findByPk(id);
    if (!shortcut) {
      return res.status(404).json({
        status: 'error',
        message: 'Shortcut not found'
      });
    }

    const [userShortcut, created] = await UserShortcut.findOrCreate({
      where: { userId, shortcutId: id },
      defaults: { isFavorite: true }
    });

    if (!created) {
      userShortcut.isFavorite = !userShortcut.isFavorite;
      await userShortcut.save();
    }

    res.json({
      status: 'success',
      data: {
        isFavorite: userShortcut.isFavorite
      }
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle favorite'
    });
  }
};

/**
 * Set custom code for user shortcut
 */
exports.setCustomCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { customCode } = req.body;
    const userId = req.user.id;

    const shortcut = await Shortcut.findByPk(id);
    if (!shortcut) {
      return res.status(404).json({
        status: 'error',
        message: 'Shortcut not found'
      });
    }

    // Check if custom code is already in use by this user
    if (customCode) {
      const existingCustom = await UserShortcut.findOne({
        where: {
          userId,
          customCode,
          shortcutId: { [Op.ne]: id }
        }
      });

      if (existingCustom) {
        return res.status(400).json({
          status: 'error',
          message: 'Custom code already in use'
        });
      }

      // Check if custom code conflicts with existing shortcut codes
      const existingShortcut = await Shortcut.findOne({
        where: { code: customCode }
      });

      if (existingShortcut) {
        return res.status(400).json({
          status: 'error',
          message: 'Custom code conflicts with existing shortcut'
        });
      }
    }

    const [userShortcut] = await UserShortcut.findOrCreate({
      where: { userId, shortcutId: id },
      defaults: { customCode }
    });

    userShortcut.customCode = customCode;
    await userShortcut.save();

    res.json({
      status: 'success',
      data: {
        customCode: userShortcut.customCode
      }
    });

  } catch (error) {
    console.error('Error setting custom code:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to set custom code'
    });
  }
};
