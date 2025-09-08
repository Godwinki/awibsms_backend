// modules/documents/controllers/documentController.js
const db = require('../../../models');
const Receipt = db.Receipt;
const ExpenseRequest = db.ExpenseRequest;
const ActivityLog = require('../../../core/utils/activityLog');
const path = require('path');
const fs = require('fs');

// Get all receipts
exports.getAllReceipts = async (req, res) => {
  try {
    const { page = 1, limit = 10, expenseRequestId, verified } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (expenseRequestId) where.expenseRequestId = expenseRequestId;
    if (verified !== undefined) where.verified = verified === 'true';

    const receipts = await Receipt.findAndCountAll({
      where,
      include: [{
        model: ExpenseRequest,
        as: 'expenseRequest',
        attributes: ['id', 'title', 'amount', 'status']
      }],
      order: [['uploadedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      receipts: receipts.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(receipts.count / limit),
        total_records: receipts.count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
};

// Get receipt by ID
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id, {
      include: [{
        model: ExpenseRequest,
        as: 'expenseRequest',
        attributes: ['id', 'title', 'amount', 'status']
      }]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
};

// Get receipts by expense request ID
exports.getReceiptsByExpenseRequest = async (req, res) => {
  try {
    const { expenseRequestId } = req.params;

    const receipts = await Receipt.findAll({
      where: { expenseRequestId },
      order: [['uploadedAt', 'DESC']]
    });

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error('Error fetching receipts for expense request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts for expense request'
    });
  }
};

// Upload receipt for expense request (from expenseController)
exports.uploadReceipt = async (req, res) => {
  try {
    const { expenseRequestId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file uploaded'
      });
    }

    // Get the expense request
    const expenseRequest = await ExpenseRequest.findByPk(expenseRequestId);
    if (!expenseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Expense request not found'
      });
    }

    // Check permissions
    if (expenseRequest.requestedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload receipts for this expense'
      });
    }

    // Check if expense is in valid status for receipt upload
    if (!['PROCESSED', 'PENDING', 'APPROVED'].includes(expenseRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Receipts can only be uploaded for PROCESSED expense requests'
      });
    }

    // Create receipt record
    const receipt = await Receipt.create({
      expenseRequestId: expenseRequestId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      description: req.body.description || null,
      amount: req.body.amount || null,
      receiptDate: req.body.receiptDate || new Date(),
      vendor: req.body.vendor || null,
      uploadedBy: req.user.id
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPLOAD',
      resource: 'Receipt',
      resourceId: receipt.id,
      details: `Uploaded receipt ${req.file.originalname} for expense request ${expenseRequest.title}`
    });

    res.status(201).json({
      success: true,
      message: 'Receipt uploaded successfully',
      receipt
    });

  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload receipt'
    });
  }
};

// Verify receipt
exports.verifyReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, verificationNotes } = req.body;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    // Update verification status
    receipt.verified = verified;
    receipt.verifiedBy = req.user.id;
    receipt.verifiedAt = new Date();
    receipt.verificationNotes = verificationNotes;
    await receipt.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'VERIFY',
      resource: 'Receipt',
      resourceId: receipt.id,
      details: `${verified ? 'Verified' : 'Rejected'} receipt ${receipt.fileName}`
    });

    res.json({
      success: true,
      message: `Receipt ${verified ? 'verified' : 'rejected'} successfully`,
      receipt
    });
  } catch (error) {
    console.error('Error verifying receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify receipt'
    });
  }
};

// Download receipt file
exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(receipt.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Receipt file not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);
    res.setHeader('Content-Type', receipt.fileType);

    // Stream the file
    const fileStream = fs.createReadStream(receipt.filePath);
    fileStream.pipe(res);

    // Log download activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DOWNLOAD',
      resource: 'Receipt',
      resourceId: receipt.id,
      details: `Downloaded receipt ${receipt.fileName}`
    });

  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download receipt'
    });
  }
};

// Delete receipt
exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(receipt.filePath)) {
      fs.unlinkSync(receipt.filePath);
    }

    // Delete record from database
    await receipt.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'Receipt',
      resourceId: id,
      details: `Deleted receipt ${receipt.fileName}`
    });

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete receipt'
    });
  }
};

// Get receipt statistics
exports.getReceiptStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.uploadedAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = await Receipt.findAll({
      where,
      attributes: [
        'verified',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('fileSize')), 'totalSize']
      ],
      group: ['verified'],
      raw: true
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching receipt statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt statistics'
    });
  }
};
