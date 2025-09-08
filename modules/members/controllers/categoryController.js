/**
 * Contact Category Controller
 * Handles creating and managing contact categories for member organization
 */

const { ContactCategory, CategoryMember, Member, User } = require('../../../models');
const { Op } = require('sequelize');

const categoryController = {
  // Create new contact category
  async createCategory(req, res) {
    try {
      const { name, description, color = 'bg-blue-500' } = req.body;
      const userId = req.user.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Check if category name already exists
      const existingCategory = await ContactCategory.findOne({ where: { name } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }

      const category = await ContactCategory.create({
        name,
        description,
        color,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        message: 'Contact category created successfully',
        data: category
      });

    } catch (error) {
      console.error('❌ Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create contact category',
        error: error.message
      });
    }
  },

  // Get all categories with pagination
  async getCategories(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      const whereClause = search 
        ? {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { description: { [Op.iLike]: `%${search}%` } }
            ]
          }
        : {};

      const { count, rows: categories } = await ContactCategory.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'categoryCreator',
            attributes: ['id', 'username', 'fullName']
          },
          {
            model: CategoryMember,
            as: 'categoryMembers',
            include: [
              {
                model: Member,
                as: 'member',
                attributes: ['id', 'fullName', 'mobile']
              }
            ]
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      // Add member count to each category
      const categoriesWithCount = categories.map(category => ({
        ...category.toJSON(),
        memberCount: category.categoryMembers ? category.categoryMembers.length : 0
      }));

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          categories: categoriesWithCount,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: count,
            itemsPerPage: limit
          }
        }
      });

    } catch (error) {
      console.error('❌ Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact categories',
        error: error.message
      });
    }
  },

  // Get single category by ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await ContactCategory.findByPk(id, {
        include: [
          {
            model: User,
            as: 'categoryCreator',
            attributes: ['id', 'username', 'fullName']
          },
          {
            model: CategoryMember,
            as: 'categoryMembers',
            include: [
              {
                model: Member,
                as: 'member',
                attributes: ['id', 'fullName', 'mobile', 'email']
              }
            ]
          }
        ]
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Contact category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });

    } catch (error) {
      console.error('❌ Get category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact category',
        error: error.message
      });
    }
  },

  // Update category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;

      const category = await ContactCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Contact category not found'
        });
      }

      // Check if new name conflicts with existing categories
      if (name && name !== category.name) {
        const existingCategory = await ContactCategory.findOne({ 
          where: { 
            name,
            id: { [Op.ne]: id }
          } 
        });
        
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Category name already exists'
          });
        }
      }

      await category.update({
        name: name || category.name,
        description: description !== undefined ? description : category.description,
        color: color || category.color
      });

      res.json({
        success: true,
        message: 'Contact category updated successfully',
        data: category
      });

    } catch (error) {
      console.error('❌ Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact category',
        error: error.message
      });
    }
  },

  // Add members to category
  async addMembersToCategory(req, res) {
    try {
      const { id } = req.params;
      const { memberIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Member IDs array is required'
        });
      }

      const category = await ContactCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Contact category not found'
        });
      }

      // Check if members exist
      const members = await Member.findAll({
        where: { id: { [Op.in]: memberIds } }
      });

      if (members.length !== memberIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some members not found'
        });
      }

      // Add members to category (avoid duplicates)
      const categoryMembers = [];
      for (const memberId of memberIds) {
        const [categoryMember, created] = await CategoryMember.findOrCreate({
          where: { categoryId: id, memberId },
          defaults: {}
        });

        categoryMembers.push(categoryMember);
      }

      res.json({
        success: true,
        message: `${memberIds.length} members added to category successfully`,
        data: {
          categoryId: id,
          addedMembers: categoryMembers.length,
          members: categoryMembers
        }
      });

    } catch (error) {
      console.error('❌ Add members to category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add members to category',
        error: error.message
      });
    }
  },

  // Remove member from category
  async removeMemberFromCategory(req, res) {
    try {
      const { id, memberId } = req.params;

      const categoryMember = await CategoryMember.findOne({
        where: { categoryId: id, memberId }
      });

      if (!categoryMember) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in this category'
        });
      }

      await categoryMember.destroy();

      res.json({
        success: true,
        message: 'Member removed from category successfully'
      });

    } catch (error) {
      console.error('❌ Remove member from category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member from category',
        error: error.message
      });
    }
  },

  // Delete category
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await ContactCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Contact category not found'
        });
      }

      // Remove all category members first
      await CategoryMember.destroy({
        where: { categoryId: id }
      });

      // Delete the category
      await category.destroy();

      res.json({
        success: true,
        message: 'Contact category deleted successfully'
      });

    } catch (error) {
      console.error('❌ Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact category',
        error: error.message
      });
    }
  }
};

module.exports = categoryController;
