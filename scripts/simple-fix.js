// Simple script to directly execute SQL
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Connect directly without using models
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost', 
  username: 'postgres',
  password: 'password',  // Replace with your actual password if different
  database: 'awibsms',   // Replace with your actual database name if different
  logging: console.log
});

async function fixPermissions() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');

    // Use raw SQL query to directly add the permission to all roles
    const sql = `
    -- Find the upload permission
    DO $$
    DECLARE
      upload_permission_id UUID;
    BEGIN
      -- Get the permission ID
      SELECT id INTO upload_permission_id FROM "Permissions" WHERE name = 'members.uploads.upload';
      
      IF upload_permission_id IS NOT NULL THEN
        -- Insert for roles that don't have this permission yet
        INSERT INTO "RolePermissions" (id, "roleId", "permissionId", "grantedAt", "createdAt", "updatedAt")
        SELECT 
          gen_random_uuid(), -- Generate UUID for each record
          r.id as "roleId", 
          upload_permission_id as "permissionId",
          NOW() as "grantedAt",
          NOW() as "createdAt",
          NOW() as "updatedAt"
        FROM "Roles" r
        WHERE NOT EXISTS (
          SELECT 1 FROM "RolePermissions" rp 
          WHERE rp."roleId" = r.id AND rp."permissionId" = upload_permission_id
        );
        
        RAISE NOTICE 'Permission assignments added successfully';
      ELSE
        RAISE NOTICE 'members.uploads.upload permission not found!';
      END IF;
    END $$;
    `;

    await sequelize.query(sql);
    console.log('Permission fix completed successfully');

  } catch (error) {
    console.error('Error fixing permissions:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

fixPermissions();
