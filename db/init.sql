-- One-time bootstrap on the EC2 server. Creates the database and app user.
-- Run as root:   sudo mysql < db/init.sql
-- Then apply schema:   ./db/migrate.sh
--
-- Change the password here AND in backend/.env before running.

CREATE DATABASE IF NOT EXISTS tug202
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'tug202_user'@'localhost' IDENTIFIED BY 'ChangeThisPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON tug202.* TO 'tug202_user'@'localhost';
FLUSH PRIVILEGES;
