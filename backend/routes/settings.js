const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../config/database');
const sql = require('mssql');

// GET user preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);

    const result = await request.query(`
      SELECT min_magnitude, notifications_enabled 
      FROM UserPreferences 
      WHERE user_id = @user_id
    `);

    if (result.recordset.length === 0) {
      // Return default preferences if not found
      return res.json({
        min_magnitude: 3.0,
        notifications_enabled: true,
      });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences', details: error.message });
  }
});

// PUT update user preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { min_magnitude, notifications_enabled } = req.body;

    // Validate input
    if (typeof min_magnitude !== 'number' || min_magnitude < 3.0 || min_magnitude > 7.0) {
      return res.status(400).json({ error: 'Invalid magnitude value (must be 3.0-7.0)' });
    }

    if (typeof notifications_enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid notifications_enabled value' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);
    request.input('min_magnitude', sql.Float, min_magnitude);
    request.input('notifications_enabled', sql.Bit, notifications_enabled ? 1 : 0);

    // Check if preferences exist
    const checkResult = await request.query(`
      SELECT id FROM UserPreferences WHERE user_id = @user_id
    `);

    if (checkResult.recordset.length === 0) {
      // Insert new preferences
      await request.query(`
        INSERT INTO UserPreferences (user_id, min_magnitude, notifications_enabled) 
        VALUES (@user_id, @min_magnitude, @notifications_enabled)
      `);
    } else {
      // Update existing preferences
      await request.query(`
        UPDATE UserPreferences 
        SET min_magnitude = @min_magnitude, notifications_enabled = @notifications_enabled 
        WHERE user_id = @user_id
      `);
    }

    res.json({ 
      message: 'Preferences updated successfully',
      min_magnitude,
      notifications_enabled,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

module.exports = router;
