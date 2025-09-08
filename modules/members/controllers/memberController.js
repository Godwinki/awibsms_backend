// controllers/memberController.js
const db = require('../../../models');
const Member = db.Member;
const Beneficiary = db.Beneficiary;
const EmergencyContact = db.EmergencyContact;
const { getNextMemberNumber } = require('../../../core/utils/accountUtils');

// Get the next available member account number
exports.getNextAccountNumber = async (req, res) => {
  console.log('📝 [Member] Request for next available account number');
  try {
    const nextNumber = await getNextMemberNumber();
    console.log('✅ [Member] Next account number generated:', nextNumber);
    res.json({ emoji: '💳', message: 'Next account number generated', accountNumber: nextNumber });
  } catch (error) {
    console.log('❌ [Member] Failed to generate next account number:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Create a new member
exports.createMember = async (req, res) => {
  console.log('📝 [Member] Create member request received');
  try {
    // Start a transaction so we can roll back if any part fails
    const transaction = await db.sequelize.transaction();
    
    try {
      // Extract beneficiaries and emergency contacts from request body
      const { beneficiaries, emergencyContacts, ...memberData } = req.body;
      
      // If no account number is provided, generate one
      if (!memberData.accountNumber) {
        memberData.accountNumber = await getNextMemberNumber();
        console.log('ℹ️ [Member] Auto-generated account number:', memberData.accountNumber);
      }
      
      // Create the member
      const member = await Member.create(memberData, { transaction });
      console.log('✅ [Member] Member created:', member.id);
      
      // Process beneficiaries if provided
      if (beneficiaries && Array.isArray(beneficiaries)) {
        console.log(`ℹ️ [Member] Processing ${beneficiaries.length} beneficiaries`);
        
        for (const benef of beneficiaries) {
          // Transform names if necessary (frontend might use 'name' instead of 'fullName')
          const benefData = {
            fullName: benef.name || benef.fullName || '',
            relationship: benef.relationship || '',
            contactInfo: benef.phone || benef.contactInfo || '',
            sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
            dateOfBirth: benef.dateOfBirth || new Date(),
            isMinor: benef.isMinor || false,
            guardianName: benef.guardianName || '',
            guardianContact: benef.guardianContact || '',
            memberId: member.id
          };
          
          await Beneficiary.create(benefData, { transaction });
        }
      } else if (typeof beneficiaries === 'string') {
        // Parse JSON string if it comes in that format
        try {
          const parsedBeneficiaries = JSON.parse(beneficiaries);
          if (Array.isArray(parsedBeneficiaries)) {
            console.log(`ℹ️ [Member] Processing ${parsedBeneficiaries.length} parsed beneficiaries`);
            
            for (const benef of parsedBeneficiaries) {
              const benefData = {
                fullName: benef.name || benef.fullName || '',
                relationship: benef.relationship || '',
                contactInfo: benef.phone || benef.contactInfo || '',
                sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
                dateOfBirth: benef.dateOfBirth || new Date(),
                isMinor: benef.isMinor || false,
                guardianName: benef.guardianName || '',
                guardianContact: benef.guardianContact || '',
                memberId: member.id
              };
              
              await Beneficiary.create(benefData, { transaction });
            }
          }
        } catch (parseError) {
          console.log('⚠️ [Member] Failed to parse beneficiaries JSON:', parseError.message);
        }
      }
      
      // Process emergency contacts if provided
      if (emergencyContacts && Array.isArray(emergencyContacts)) {
        console.log(`ℹ️ [Member] Processing ${emergencyContacts.length} emergency contacts`);
        
        for (const contact of emergencyContacts) {
          // Transform names if necessary
          const contactData = {
            fullName: contact.name || contact.fullName || '',
            relationship: contact.relationship || '',
            primaryPhone: contact.phone || contact.primaryPhone || '',
            alternativePhone: contact.alternativePhone || '',
            email: contact.email || '',
            address: contact.address || '',
            memberId: member.id
          };
          
          await EmergencyContact.create(contactData, { transaction });
        }
      } else if (typeof emergencyContacts === 'string') {
        // Parse JSON string if it comes in that format
        try {
          const parsedContacts = JSON.parse(emergencyContacts);
          if (Array.isArray(parsedContacts)) {
            console.log(`ℹ️ [Member] Processing ${parsedContacts.length} parsed emergency contacts`);
            
            for (const contact of parsedContacts) {
              const contactData = {
                fullName: contact.name || contact.fullName || '',
                relationship: contact.relationship || '',
                primaryPhone: contact.phone || contact.primaryPhone || '',
                alternativePhone: contact.alternativePhone || '',
                email: contact.email || '',
                address: contact.address || '',
                memberId: member.id
              };
              
              await EmergencyContact.create(contactData, { transaction });
            }
          }
        } catch (parseError) {
          console.log('⚠️ [Member] Failed to parse emergency contacts JSON:', parseError.message);
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Fetch the member with all associations to return
      const memberWithRelations = await Member.findByPk(member.id, {
        include: [
          { model: Beneficiary, as: 'beneficiaries' },
          { model: EmergencyContact, as: 'emergencyContacts' }
        ]
      });
      
      res.status(201).json({ 
        emoji: '🎉', 
        message: 'Member created successfully', 
        member: memberWithRelations 
      });
    } catch (error) {
      // Rollback transaction if anything fails
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.log('❌ [Member] Failed to create member:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Get all members
exports.getMembers = async (req, res) => {
  console.log('📥 [Member] Request to list all members received');
  try {
    const members = await Member.findAll();
    console.log(`✅ [Member] Returned ${members.length} members`);
    res.json({ emoji: '📖', message: 'All members fetched successfully', members });
  } catch (error) {
    console.log('❌ [Member] Failed to fetch members:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get a single member by ID
exports.getMemberById = async (req, res) => {
  console.log(`📥 [Member] Request to get member: ${req.params.id}`);
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: Beneficiary, as: 'beneficiaries' },
        { model: EmergencyContact, as: 'emergencyContacts' },
        // Keep any other includes that you need
      ]
    });
    
    if (!member) {
      console.log(`⚠️ [Member] Member not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    
    console.log(`✅ [Member] Member returned: ${req.params.id}`);
    res.json({ emoji: '🧑', message: 'Member fetched successfully', member });
  } catch (error) {
    console.log('❌ [Member] Failed to fetch member:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Update a member
exports.updateMember = async (req, res) => {
  console.log(`📝 [Member] Update request for member: ${req.params.id}`);
  try {
    // Start a transaction
    const transaction = await db.sequelize.transaction();
    
    try {
      // Extract beneficiaries and emergency contacts from request body
      const { beneficiaries, emergencyContacts, ...memberData } = req.body;
      
      const member = await Member.findByPk(req.params.id);
      if (!member) {
        console.log(`⚠️ [Member] Member not found: ${req.params.id}`);
        await transaction.rollback();
        return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
      }
      
      // Update member data
      await member.update(memberData, { transaction });
      
      // Handle beneficiaries if provided
      if (beneficiaries && (Array.isArray(beneficiaries) || typeof beneficiaries === 'string')) {
        // First, remove existing beneficiaries
        await Beneficiary.destroy({
          where: { memberId: member.id },
          transaction
        });
        
        // Then add the new ones
        let beneficiaryArray = beneficiaries;
        if (typeof beneficiaries === 'string') {
          try {
            beneficiaryArray = JSON.parse(beneficiaries);
          } catch (parseError) {
            console.log('⚠️ [Member] Failed to parse beneficiaries JSON:', parseError.message);
            beneficiaryArray = [];
          }
        }
        
        if (Array.isArray(beneficiaryArray)) {
          for (const benef of beneficiaryArray) {
            const benefData = {
              fullName: benef.name || benef.fullName || '',
              relationship: benef.relationship || '',
              contactInfo: benef.phone || benef.contactInfo || '',
              sharePercentage: parseFloat(benef.percentage || benef.sharePercentage || '0'),
              dateOfBirth: benef.dateOfBirth || new Date(),
              isMinor: benef.isMinor || false,
              guardianName: benef.guardianName || '',
              guardianContact: benef.guardianContact || '',
              memberId: member.id
            };
            
            await Beneficiary.create(benefData, { transaction });
          }
        }
      }
      
      // Handle emergency contacts if provided
      if (emergencyContacts && (Array.isArray(emergencyContacts) || typeof emergencyContacts === 'string')) {
        // First, remove existing emergency contacts
        await EmergencyContact.destroy({
          where: { memberId: member.id },
          transaction
        });
        
        // Then add the new ones
        let contactsArray = emergencyContacts;
        if (typeof emergencyContacts === 'string') {
          try {
            contactsArray = JSON.parse(emergencyContacts);
          } catch (parseError) {
            console.log('⚠️ [Member] Failed to parse emergency contacts JSON:', parseError.message);
            contactsArray = [];
          }
        }
        
        if (Array.isArray(contactsArray)) {
          for (const contact of contactsArray) {
            const contactData = {
              fullName: contact.name || contact.fullName || '',
              relationship: contact.relationship || '',
              primaryPhone: contact.phone || contact.primaryPhone || '',
              alternativePhone: contact.alternativePhone || '',
              email: contact.email || '',
              address: contact.address || '',
              memberId: member.id
            };
            
            await EmergencyContact.create(contactData, { transaction });
          }
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Fetch the updated member with all associations
      const updatedMember = await Member.findByPk(member.id, {
        include: [
          { model: Beneficiary, as: 'beneficiaries' },
          { model: EmergencyContact, as: 'emergencyContacts' }
        ]
      });
      
      console.log(`✅ [Member] Member updated: ${req.params.id}`);
      res.json({ emoji: '🔄', message: 'Member updated successfully', member: updatedMember });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.log(`❌ [Member] Failed to update member: ${req.params.id}`, error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Delete a member and all associated records
exports.deleteMember = async (req, res) => {
  const memberId = req.params.id;
  console.log(`🗑️ [Member] Delete request for member: ${memberId}`);
  
  // Start a transaction to ensure all deletions are atomic
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      console.log(`⚠️ [Member] Member not found for delete: ${memberId}`);
      await transaction.rollback();
      return res.status(404).json({ emoji: '⚠️', error: 'Member not found' });
    }
    
    // First fetch all accounts belonging to this member
    const memberAccounts = [];
    if (db.MemberAccount) {
      const accounts = await db.MemberAccount.findAll({
        where: { memberId: memberId },
        transaction
      }).catch(() => []);
      memberAccounts.push(...accounts);
    }
    
    // Get account IDs for transaction deletion
    const accountIds = memberAccounts.map(account => account.id);
    
    // Get counts for reporting
    const beneficiaryCount = db.Beneficiary ? 
      await db.Beneficiary.count({ where: { memberId } }).catch(() => 0) : 0;
      
    const emergencyContactCount = db.EmergencyContact ? 
      await db.EmergencyContact.count({ where: { memberId } }).catch(() => 0) : 0;
      
    const accountCount = memberAccounts.length;
    
    const paymentCount = db.Payment ? 
      await db.Payment.count({ where: { memberId } }).catch(() => 0) : 0;
      
    const loanCount = db.Loan ? 
      await db.Loan.count({ where: { memberId } }).catch(() => 0) : 0;
    
    let transactionCount = 0;
    if (db.Transaction && accountIds.length > 0) {
      transactionCount = await db.Transaction.count({
        where: { accountId: { [db.Sequelize.Op.in]: accountIds } }
      }).catch(() => 0);
    }
    
    console.log(`ℹ️ [Member] Deleting member ${memberId} with: ${beneficiaryCount} beneficiaries, ` +
      `${emergencyContactCount} emergency contacts, ${accountCount} accounts, ${paymentCount} payments, ` +
      `${loanCount} loans, ${transactionCount} transactions`);
    
    // Delete transactions first
    if (db.Transaction && accountIds.length > 0) {
      console.log(`Deleting transactions for accounts: ${accountIds.join(', ')}`);
      await db.Transaction.destroy({
        where: { accountId: { [db.Sequelize.Op.in]: accountIds } },
        transaction
      }).catch(err => console.log('Error deleting transactions:', err.message));
    }
    
    // Delete payments
    if (db.Payment) {
      await db.Payment.destroy({
        where: { memberId },
        transaction
      }).catch(err => console.log('Error deleting payments:', err.message));
    }
    
    // Delete loans (if they exist)
    if (db.Loan) {
      await db.Loan.destroy({
        where: { memberId },
        transaction
      }).catch(err => console.log('Error deleting loans:', err.message));
    }
    
    // Delete member accounts
    if (db.MemberAccount) {
      await db.MemberAccount.destroy({
        where: { memberId },
        transaction
      }).catch(err => console.log('Error deleting member accounts:', err.message));
    }
    
    // Delete beneficiaries
    if (db.Beneficiary) {
      await db.Beneficiary.destroy({
        where: { memberId },
        transaction
      }).catch(err => console.log('Error deleting beneficiaries:', err.message));
    }
    
    // Delete emergency contacts
    if (db.EmergencyContact) {
      await db.EmergencyContact.destroy({
        where: { memberId },
        transaction
      }).catch(err => console.log('Error deleting emergency contacts:', err.message));
    }
    
    // Finally delete the member
    await member.destroy({ transaction });
    
    // If all operations succeed, commit the transaction
    await transaction.commit();
    
    console.log(`✅ [Member] Member and all related records deleted successfully`);
    res.json({ 
      emoji: '🗑️', 
      message: 'Member deleted successfully', 
      details: {
        beneficiariesDeleted: beneficiaryCount,
        emergencyContactsDeleted: emergencyContactCount,
        accountsDeleted: accountCount,
        paymentsDeleted: paymentCount,
        loansDeleted: loanCount,
        transactionsDeleted: transactionCount
      }
    });
  } catch (error) {
    // If any operation fails, rollback the transaction
    await transaction.rollback();
    console.log(`❌ [Member] Failed to delete member: ${error.message}`);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Verify member by name and phone
exports.verifyMember = async (req, res) => {
  console.log('🔍 [Member] Verify member request received');
  try {
    const { fullName, phoneNumber } = req.body;
    
    if (!fullName || !phoneNumber) {
      return res.status(400).json({ 
        emoji: '❌', 
        error: 'Full name and phone number are required' 
      });
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Search for member by full name and phone number
    const member = await Member.findOne({
      where: {
        fullName: {
          [db.Sequelize.Op.iLike]: `%${fullName}%` // Case-insensitive partial match
        },
        mobile: {
          [db.Sequelize.Op.like]: `%${cleanPhoneNumber}%` // Allow partial phone match
        }
      },
      attributes: ['id', 'fullName', 'mobile', 'accountNumber', 'createdAt']
    });
    
    if (member) {
      console.log('✅ [Member] Member verified:', member.id);
      res.json({ 
        emoji: '✅', 
        message: 'Member verified successfully',
        verified: true,
        member: {
          id: member.id,
          fullName: member.fullName,
          mobile: member.mobile,
          accountNumber: member.accountNumber,
          memberSince: member.createdAt
        }
      });
    } else {
      console.log('❌ [Member] Member not found');
      res.json({ 
        emoji: '❌', 
        message: 'Member not found. Please check your name and phone number.',
        verified: false
      });
    }
  } catch (error) {
    console.log(`❌ [Member] Failed to verify member: ${error.message}`);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Public endpoint to verify member by name only (for form access)
exports.verifyMemberByName = async (req, res) => {
  console.log('🔍 [Member] Public name verification request received');
  try {
    const { firstName, lastName } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ 
        emoji: '❌', 
        error: 'First name and last name are required' 
      });
    }
    
    // Search for member by matching both first and last names in fullName field
    const member = await Member.findOne({
      where: {
        fullName: {
          [db.Sequelize.Op.and]: [
            { [db.Sequelize.Op.iLike]: `%${firstName}%` }, // Case-insensitive partial match for first name
            { [db.Sequelize.Op.iLike]: `%${lastName}%` }   // Case-insensitive partial match for last name
          ]
        }
      },
      attributes: ['id', 'fullName', 'accountNumber'] // Only return minimal info for security
    });
    
    if (member) {
      console.log('✅ [Member] Member name verified:', member.id);
      res.json({ 
        emoji: '✅', 
        message: 'Member verified successfully',
        verified: true,
        member: {
          fullName: member.fullName,
          accountNumber: member.accountNumber
        }
      });
    } else {
      console.log('❌ [Member] Member name not found');
      res.json({ 
        emoji: '❌', 
        message: 'Member not found. Please check your first and last name spelling.',
        verified: false
      });
    }
  } catch (error) {
    console.log(`❌ [Member] Failed to verify member name: ${error.message}`);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
