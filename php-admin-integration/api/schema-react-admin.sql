-- React Admin / Manage Staff migration.
-- Run this only if your admin_users table does not already have these columns.
ALTER TABLE admin_users
  ADD COLUMN contact_mobile VARCHAR(15) NULL AFTER role,
  ADD COLUMN email VARCHAR(190) NULL AFTER contact_mobile;
