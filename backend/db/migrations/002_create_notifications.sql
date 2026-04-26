-- Migration: Create Notifications table for sending notifications between users
-- Database: SafeQuake
-- Date: 2026-04-12

USE SafeQuake;
GO

-- Create Notifications table if it doesn't exist
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        type NVARCHAR(50) NOT NULL DEFAULT 'safety_status', -- safety_status, alert, friend_request, etc.
        message NVARCHAR(500) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'unread', -- unread, read
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_Notifications_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT FK_Notifications_Sender
            FOREIGN KEY (sender_id) REFERENCES dbo.Users(id)
            ON DELETE CASCADE,
        CONSTRAINT FK_Notifications_Receiver
            FOREIGN KEY (receiver_id) REFERENCES dbo.Users(id)
            ON DELETE CASCADE
    );

    -- Create index for faster queries
    CREATE INDEX IDX_Notifications_Receiver ON dbo.Notifications(receiver_id, status, created_at DESC);
    CREATE INDEX IDX_Notifications_Sender ON dbo.Notifications(sender_id, created_at DESC);

    PRINT 'Table [dbo.Notifications] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [dbo.Notifications] already exists. No changes made.';
END
GO

-- Verify table creation
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL
BEGIN
    PRINT 'Verification: Table [dbo.Notifications] is ready.';
    SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Notifications'
    ORDER BY ORDINAL_POSITION;
END
GO
