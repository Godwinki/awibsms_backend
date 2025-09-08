// MessageStatus.js - Track delivery status updates for messages
module.exports = (sequelize, DataTypes) => {
  const MessageStatus = sequelize.define('MessageStatus', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SmsMessages', // This refers to the table name directly
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed', 'expired'),
      allowNull: false
    },
    statusCode: {
      type: DataTypes.STRING // Kilakona status code
    },
    explanation: {
      type: DataTypes.TEXT // Kilakona explanation
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    source: {
      type: DataTypes.ENUM('api_response', 'delivery_report', 'manual_update'),
      allowNull: false,
      defaultValue: 'api_response'
    },
    rawData: {
      type: DataTypes.TEXT // Store raw API response as JSON
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['updatedAt']
      },
      {
        fields: ['source']
      }
    ]
  });

  MessageStatus.associate = (models) => {
    // Belongs to SmsMessage
    MessageStatus.belongsTo(models.SmsMessage, {
      foreignKey: {
        name: 'messageId',
        allowNull: false
      },
      as: 'message',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };
  
  // Add hook to execute raw SQL to make constraints deferrable
  MessageStatus.addHook('afterSync', async (options) => {
    try {
      await sequelize.query(`
        ALTER TABLE "MessageStatuses" DROP CONSTRAINT IF EXISTS "MessageStatuses_messageId_fkey";
        ALTER TABLE "MessageStatuses" ADD CONSTRAINT "MessageStatuses_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "SmsMessages" (id) DEFERRABLE INITIALLY IMMEDIATE;
      `);
      console.log('✅ Made MessageStatuses_messageId_fkey constraint deferrable'.green);
    } catch (error) {
      console.error(`❌ Error making MessageStatuses constraints deferrable: ${error.message}`.red);
    }
  });

  return MessageStatus;
};
