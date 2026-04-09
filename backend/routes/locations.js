const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const sql = require('mssql');

const router = express.Router();

// POST save/update user's last location
router.post('/save', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const user_id = req.userId;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    request.input('latitude', sql.Decimal(9, 6), latitude);
    request.input('longitude', sql.Decimal(9, 6), longitude);

    // Upsert: update if exists, insert if not
    await request.query(`
      IF EXISTS (SELECT 1 FROM UserLastLocation WHERE user_id = @user_id)
      BEGIN
        UPDATE UserLastLocation
        SET
          latitude = @latitude,
          longitude = @longitude,
          updated_at = SYSDATETIME()
        WHERE user_id = @user_id;
      END
      ELSE
      BEGIN
        INSERT INTO UserLastLocation (user_id, latitude, longitude)
        VALUES (@user_id, @latitude, @longitude);
      END
    `);

    res.json({
      message: 'Location saved successfully',
      location: {
        user_id,
        latitude,
        longitude,
        updated_at: new Date(),
      },
    });
  } catch (err) {
    console.error('Save location error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET user's last location
router.get('/', authenticate, async (req, res) => {
  try {
    const user_id = req.userId;

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);

    const result = await request.query(`
      SELECT
        user_id,
        latitude,
        longitude,
        updated_at
      FROM UserLastLocation
      WHERE user_id = @user_id
    `);

    if (result.recordset.length === 0) {
      return res.json({
        user_id,
        latitude: null,
        longitude: null,
        updated_at: null,
        message: 'No location data found',
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get location error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET specific user's last location (admin/service use)
router.get('/:user_id', authenticate, async (req, res) => {
  try {
    const target_user_id = parseInt(req.params.user_id, 10);

    if (isNaN(target_user_id)) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, target_user_id);

    const result = await request.query(`
      SELECT
        user_id,
        latitude,
        longitude,
        updated_at
      FROM UserLastLocation
      WHERE user_id = @user_id
    `);

    if (result.recordset.length === 0) {
      return res.json({
        user_id: target_user_id,
        latitude: null,
        longitude: null,
        updated_at: null,
        message: 'No location data found',
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get user location error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
