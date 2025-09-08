// controllers/branchController.js
const BranchService = require('../services/branchService');

class BranchController {
  /**
   * Get all branches with optional filtering
   */
  static async getAllBranches(req, res) {
    try {
      const filters = {
        region: req.query.region,
        isActive: req.query.isActive,
        branchType: req.query.branchType,
        includeInactive: req.query.includeInactive === 'true',
        search: req.query.search,
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      const result = await BranchService.getAllBranches(filters);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.getAllBranches error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get branch by ID
   */
  static async getBranchById(req, res) {
    try {
      const { id } = req.params;
      const result = await BranchService.getBranchById(id);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.getBranchById error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Create new branch
   */
  static async createBranch(req, res) {
    try {
      const userId = req.user?.id;
      const result = await BranchService.createBranch(req.body, userId);

      if (!result.success) {
        const statusCode = result.field ? 400 : 422;
        return res.status(statusCode).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('BranchController.createBranch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update branch
   */
  static async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await BranchService.updateBranch(id, req.body, userId);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.updateBranch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete/deactivate branch
   */
  static async deleteBranch(req, res) {
    try {
      const { id } = req.params;
      const softDelete = req.query.soft !== 'false'; // Default to soft delete
      const result = await BranchService.deleteBranch(id, softDelete);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.deleteBranch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate account number for branch
   */
  static async generateAccountNumber(req, res) {
    try {
      const { id } = req.params;
      const result = await BranchService.generateAccountNumber(id);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.generateAccountNumber error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get branches by region
   */
  static async getBranchesByRegion(req, res) {
    try {
      const { region } = req.params;
      const result = await BranchService.getBranchesByRegion(region);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.getBranchesByRegion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get branch statistics
   */
  static async getBranchStatistics(req, res) {
    try {
      const { id } = req.params;
      const result = await BranchService.getBranchStatistics(id);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.getBranchStatistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Validate branch code uniqueness
   */
  static async validateBranchCode(req, res) {
    try {
      const { branchCode, excludeId } = req.body;
      const result = await BranchService.validateBranchCode(branchCode, excludeId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        valid: result.isUnique,
        message: result.message,
        field: 'branchCode'
      });
    } catch (error) {
      console.error('BranchController.validateBranchCode error:', error);
      res.status(500).json({
        success: false,
        valid: false,
        message: 'Validation error occurred',
        field: 'branchCode'
      });
    }
  }

  /**
   * Update branch status
   */
  static async updateBranchStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await BranchService.updateBranchStatus(id, status);

      if (!result.success) {
        const statusCode = result.message === 'Branch not found' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('BranchController.updateBranchStatus error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check branch code availability
   */
  static async checkBranchCodeAvailability(req, res) {
    try {
      const { branchCode } = req.params;
      const result = await BranchService.validateBranchCode(branchCode);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        available: result.isUnique,
        message: result.isUnique ? 'Branch code is available' : 'Branch code is already taken'
      });
    } catch (error) {
      console.error('BranchController.checkBranchCodeAvailability error:', error);
      res.status(500).json({
        success: false,
        available: false,
        message: 'Error checking branch code availability'
      });
    }
  }
}

module.exports = BranchController;
