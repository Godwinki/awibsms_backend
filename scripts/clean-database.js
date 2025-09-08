require('dotenv').config();
const { sequelize } = require('../core/database/database');
const colors = require('colors');

const cleanDatabase = async () => {
  try {
    console.log('🧹 Starting complete database cleanup...'.yellow);
    
    // First, get all table names
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    console.log(`Found ${tables.length} tables to drop`.cyan);
    
    // Drop each table with CASCADE
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
        console.log(`✅ Dropped table: ${table.tablename}`.green);
      } catch (error) {
        console.log(`⚠️ Could not drop table ${table.tablename}: ${error.message}`.yellow);
      }
    }
    
    // Also drop sequences and other objects
    const [sequences] = await sequelize.query(`
      SELECT sequence_name FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequences) {
      try {
        await sequelize.query(`DROP SEQUENCE IF EXISTS "${seq.sequence_name}" CASCADE;`);
        console.log(`✅ Dropped sequence: ${seq.sequence_name}`.green);
      } catch (error) {
        console.log(`⚠️ Could not drop sequence ${seq.sequence_name}: ${error.message}`.yellow);
      }
    }
    
    console.log('🎉 Database completely cleaned!'.green);
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('✅ Database cleanup completed successfully'.green);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanDatabase };
