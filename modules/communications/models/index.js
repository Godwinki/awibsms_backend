// Index file for Communications models - Force reload timestamp: 2025-08-21T11:30:00
const { sequelize } = require("../../../core/database/database");

let models = {};

try {
  // Clear any cached models to ensure fresh load
  delete require.cache[require.resolve('./SmsMessage')];
  delete require.cache[require.resolve('./ContactGroup')];
  delete require.cache[require.resolve('./GroupMember')];
  delete require.cache[require.resolve('./SmsCampaign')];
  delete require.cache[require.resolve('./MessageStatus')];
  delete require.cache[require.resolve('./SmsBalance')];
  
  // Import all communication models without associations first
  console.log('📱 Loading communications models (fresh reload)...');
  
  const ContactGroup = require('./ContactGroup')(sequelize, sequelize.Sequelize.DataTypes);
  const GroupMember = require('./GroupMember')(sequelize, sequelize.Sequelize.DataTypes);
  const SmsMessage = require('./SmsMessage')(sequelize, sequelize.Sequelize.DataTypes);
  const SmsCampaign = require('./SmsCampaign')(sequelize, sequelize.Sequelize.DataTypes);
  const MessageStatus = require('./MessageStatus')(sequelize, sequelize.Sequelize.DataTypes);
  const SmsBalance = require('./SmsBalance')(sequelize, sequelize.Sequelize.DataTypes);

  models = {
    ContactGroup,
    GroupMember,
    SmsMessage,
    SmsCampaign,
    MessageStatus,
    SmsBalance
  };

  console.log('✅ Communications models loaded successfully (fresh reload)');
  console.log('📋 Loaded models:', Object.keys(models));
  
} catch (error) {
  console.error('❌ Error loading communications models:', error.message);
  console.error(error.stack);
  models = {};
}

module.exports = models;
