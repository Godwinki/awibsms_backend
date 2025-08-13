// Check recent announcements and their banner URLs
const db = require('./models');

async function checkAnnouncements() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');
    
    const announcements = await db.Announcement.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'bannerUrl', 'bannerPath', 'bannerOriginalName']
    });
    
    console.log('\n📋 Recent announcements:');
    announcements.forEach(a => {
      console.log(`\n🔍 ID: ${a.id}`);
      console.log(`   Title: ${a.title}`);
      console.log(`   BannerURL: ${a.bannerUrl}`);
      console.log(`   BannerPath: ${a.bannerPath}`);
      console.log(`   OriginalName: ${a.bannerOriginalName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAnnouncements();
