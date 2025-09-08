// modules/payments/controllers/paymentController.js
const db = require('../../../models');
const Payment = db.Payment;
const Member = db.Member;
const ActivityLog = require('../../../core/utils/activityLog');

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, memberId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (memberId) where.memberId = memberId;

    const payments = await Payment.findAndCountAll({
      where,
      include: [{
        model: Member,
        as: 'member',
        attributes: ['id', 'firstName', 'lastName', 'memberNumber']
      }],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      payments: payments.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(payments.count / limit),
        total_records: payments.count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [{
        model: Member,
        as: 'member',
        attributes: ['id', 'firstName', 'lastName', 'memberNumber']
      }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    });
  }
};

// Get payments by member ID
exports.getPaymentsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { memberId };
    if (type) where.type = type;
    if (status) where.status = status;

    const payments = await Payment.findAndCountAll({
      where,
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      payments: payments.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(payments.count / limit),
        total_records: payments.count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching member payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member payments'
    });
  }
};

// Create a new payment
exports.createPayment = async (req, res) => {
  try {
    const { memberId, amount, type, description, reference, breakdown } = req.body;

    // Validate required fields
    if (!memberId || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Member ID, amount, and type are required'
      });
    }

    // Verify member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    const payment = await Payment.create({
      memberId,
      amount,
      type,
      description,
      reference,
      breakdown,
      status: 'COMPLETED',
      paymentDate: new Date(),
      createdBy: req.user.id
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Payment',
      resourceId: payment.id,
      details: `Created payment of ${amount} for member ${member.firstName} ${member.lastName}`
    });

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    });
  }
};

// Process initial membership payment (from accountController)
exports.processInitialPayment = async (req, res) => {
  const { memberId } = req.params;
  console.log(`📥 [Initial Payment] Request received for member ID: ${memberId}`);

  try {
    // First check if member has already made an initial payment
    console.log('⏳ Checking if member has already made an initial payment...');
    const existingPayment = await Payment.findOne({
      where: {
        memberId: memberId,
        type: 'INITIAL_PAYMENT'
      }
    });

    if (existingPayment) {
      console.log('⚠️ Member has already made an initial payment');
      return res.status(400).json({
        success: false,
        error: 'Member has already made an initial payment' 
      });
    }

    console.log('⏳ Validating payment details...');
    console.log('💰 Payment details:', JSON.stringify(req.body, null, 2));

    const {
      membershipFee,
      shareFee,
      processingFee,
      totalPaid,
      paymentMethod,
      transactionRef,
      breakdown
    } = req.body;

    // Basic validation
    if (!membershipFee || !shareFee || !totalPaid) {
      console.log('❌ Missing required payment fields');
      return res.status(400).json({
        success: false,
        error: 'Membership fee, share fee, and total paid are required'
      });
    }

    const calculatedTotal = parseFloat(membershipFee) + parseFloat(shareFee) + (parseFloat(processingFee) || 0);
    if (Math.abs(calculatedTotal - parseFloat(totalPaid)) > 0.01) {
      console.log(`❌ Payment total mismatch. Calculated: ${calculatedTotal}, Paid: ${totalPaid}`);
      return res.status(400).json({
        success: false,
        error: 'Payment total does not match the sum of fees'
      });
    }

    // Verify member exists
    console.log('⏳ Verifying member exists...');
    const member = await Member.findByPk(memberId);
    if (!member) {
      console.log('❌ Member not found');
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    console.log(`✅ Member found: ${member.firstName} ${member.lastName}`);

    // Create a record of the payment with proper error handling
    let paymentRecord;
    try {
      console.log('⏳ Creating payment record...');
      paymentRecord = await Payment.create({
        memberId: memberId,
        amount: totalPaid,
        type: 'INITIAL_PAYMENT',
        description: 'Initial membership payment including membership fee, share fee, and processing fee',
        reference: transactionRef || null,
        breakdown: breakdown || {
          membershipFee: parseFloat(membershipFee),
          shareFee: parseFloat(shareFee),
          processingFee: parseFloat(processingFee) || 0,
          paymentMethod: paymentMethod || 'CASH'
        },
        status: 'COMPLETED',
        paymentDate: new Date(),
        createdBy: req.user.id
      });
      
      console.log(`✅ Payment record created with ID: ${paymentRecord.id}`);
    } catch (paymentError) {
      console.error('❌ Error creating payment record:', paymentError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment record',
        details: paymentError.message
      });
    }

    // Log the activity
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'CREATE',
        resource: 'Payment',
        resourceId: paymentRecord.id,
        details: `Processed initial payment of UGX ${totalPaid} for member ${member.firstName} ${member.lastName} (${member.memberNumber})`
      });
    } catch (logError) {
      console.warn('⚠️ Failed to log activity:', logError.message);
    }

    console.log('🎉 Initial payment processed successfully');
    res.status(201).json({
      success: true,
      message: 'Initial payment processed successfully',
      payment: paymentRecord,
      member: {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        memberNumber: member.memberNumber
      }
    });

  } catch (error) {
    console.error('❌ Error processing initial payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process initial payment',
      details: error.message
    });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (PENDING, COMPLETED, FAILED, REVERSED)'
      });
    }

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    payment.status = status;
    await payment.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'Payment',
      resourceId: payment.id,
      details: `Updated payment status to ${status}`
    });

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    await payment.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'Payment',
      resourceId: id,
      details: `Deleted payment of ${payment.amount}`
    });

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment'
    });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.paymentDate = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    if (type) where.type = type;

    const stats = await Payment.findAll({
      where,
      attributes: [
        'type',
        'status',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total']
      ],
      group: ['type', 'status'],
      raw: true
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics'
    });
  }
};
