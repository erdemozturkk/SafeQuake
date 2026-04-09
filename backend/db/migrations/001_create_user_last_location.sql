-- Migration: Create UserLastLocation table for storing user's latest GPS coordinates
-- Database: SafeQuake
-- Date: 2026-04-08

USE SafeQuake;
GO

-- Create UserLastLocation table if it doesn't exist
IF OBJECT_ID('dbo.UserLastLocation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserLastLocation
    (
        user_id INT NOT NULL PRIMARY KEY,
        latitude DECIMAL(9,6) NOT NULL,
        longitude DECIMAL(9,6) NOT NULL,
        updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_UserLastLocation_updated_at DEFAULT SYSDATETIME(),

        CONSTRAINT FK_UserLastLocation_Users
            FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
            ON DELETE CASCADE
    );

    PRINT 'Table [dbo.UserLastLocation] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [dbo.UserLastLocation] already exists. No changes made.';
END
GO

-- Verify table creation
IF OBJECT_ID('dbo.UserLastLocation', 'U') IS NOT NULL
BEGIN
    PRINT 'Verification: Table [dbo.UserLastLocation] is ready.';
    SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'UserLastLocation'
    ORDER BY ORDINAL_POSITION;
END
GO
