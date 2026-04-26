-- Migration: Add related_user_id to EmergencyContacts
-- Database: SafeQuake
-- Date: 2026-04-12

USE SafeQuake;
GO

-- Add related_user_id column if it doesn't exist
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'EmergencyContacts' AND COLUMN_NAME = 'related_user_id'
)
BEGIN
  ALTER TABLE dbo.EmergencyContacts
  ADD related_user_id INT NULL;

  -- Add foreign key constraint
  ALTER TABLE dbo.EmergencyContacts
  ADD CONSTRAINT FK_EmergencyContacts_RelatedUser
    FOREIGN KEY (related_user_id) REFERENCES dbo.Users(id)
    ON DELETE SET NULL;

  PRINT 'Column [related_user_id] added to [dbo.EmergencyContacts].';
END
ELSE
BEGIN
  PRINT 'Column [related_user_id] already exists. No changes made.';
END
GO
