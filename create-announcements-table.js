const db = require('./models');

async function createAnnouncementsTable() {
  try {
    console.log('Creating Announcements table...');
    
    // Force sync the Announcement model to create the table
    await db.Announcement.sync({ force: false });
    
    console.log('✅ Announcements table created successfully');
    
    // Test the table by checking if we can query it
    const count = await db.Announcement.count();
    console.log(`📊 Announcements table is ready. Current count: ${count}`);
    
  } catch (error) {
    console.error('❌ Error creating Announcements table:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

createAnnouncementsTable();
