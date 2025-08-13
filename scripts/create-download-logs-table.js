// scripts/create-download-logs-table.js
const sequelize = require('../config/database');

async function createDownloadLogsTable() {
  try {
    console.log('📊 [Migration] Creating download_logs table...');

    // Create the download_logs table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS download_logs (
        id SERIAL PRIMARY KEY,
        "memberName" VARCHAR(255) NOT NULL,
        "memberAccountNumber" VARCHAR(255),
        "documentId" UUID NOT NULL,
        "documentTitle" VARCHAR(255) NOT NULL,
        "documentCategory" VARCHAR(255) NOT NULL,
        "downloadType" VARCHAR(50) NOT NULL CHECK ("downloadType" IN ('CONTRACT', 'COLLATERAL', 'LOAN_APPLICATION', 'GENERAL_FORM')),
        "phoneNumber" VARCHAR(50),
        "loanAmount" DECIMAL(15, 2),
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        location JSONB,
        verified BOOLEAN DEFAULT false,
        "downloadedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY ("documentId") REFERENCES public_documents(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_download_logs_member_name ON download_logs ("memberName");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_download_logs_document_id ON download_logs ("documentId");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_download_logs_download_type ON download_logs ("downloadType");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_download_logs_downloaded_at ON download_logs ("downloadedAt");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_download_logs_verified ON download_logs (verified);
    `);

    console.log('✅ [Migration] download_logs table created successfully');
    console.log('📋 [Migration] Created indexes for better query performance');
    
  } catch (error) {
    console.error('❌ [Migration] Error creating download_logs table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createDownloadLogsTable()
    .then(() => {
      console.log('🎉 [Migration] Download logs table migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [Migration] Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createDownloadLogsTable;
