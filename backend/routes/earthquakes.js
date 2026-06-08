const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const sql = require('mssql');

const earthquakeDataService = require('../services/earthquakeDataService');

const router = express.Router();

// GET live earthquake data (Kandilli XML + AFAD API)
router.get('/live', async (req, res) => {
  try {
    const earthquakes = await earthquakeDataService.getLiveEarthquakes();
    
    res.json({
      status: true,
      httpStatus: 200,
      desc: '',
      result: earthquakes,
      metadata: {
        total: earthquakes.length,
        date: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Live earthquakes error:', err);
    res.status(500).json({
      status: false,
      httpStatus: 500,
      desc: err.message,
      result: [],
    });
  }
});

// Haversine formula: 100km içindeyse true
const isWithin100km = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= 100;
};

// POST add earthquake and notify nearby contacts
router.post('/', async (req, res) => {
  try {
    const { magnitude, location, latitude, longitude, depth, earthquake_time, provider } = req.body;

    if (!magnitude || !location || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Required fields: magnitude, location, latitude, longitude' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('magnitude', sql.Float, magnitude);
    request.input('location', sql.NVarChar, location);
    request.input('latitude', sql.Float, latitude);
    request.input('longitude', sql.Float, longitude);
    request.input('depth', sql.Float, depth || 0);
    request.input('earthquake_time', sql.DateTime, earthquake_time || new Date());
    request.input('provider', sql.NVarChar, provider || 'SafeQuake');

    // Insert earthquake
    const eqResult = await request.query(`
      INSERT INTO Earthquakes (magnitude, location, latitude, longitude, depth, earthquake_time, provider)
      VALUES (@magnitude, @location, @latitude, @longitude, @depth, @earthquake_time, @provider);
      SELECT SCOPE_IDENTITY() as id;
    `);

    const earthquakeId = eqResult.recordset[0].id;

    // If magnitude >= 4.0, notify nearby contacts
    if (magnitude >= 4.0) {
      // Get all users with locations
      const usersLocReq = pool.request();
      const usersLocResult = await usersLocReq.query(`
        SELECT DISTINCT u.id, u.name, ul.latitude, ul.longitude
        FROM Users u
        LEFT JOIN UserLastLocation ul ON u.id = ul.user_id
        WHERE ul.latitude IS NOT NULL AND ul.longitude IS NOT NULL
      `);

      const usersWithLocation = usersLocResult.recordset;

      // Check each user
      for (const user of usersWithLocation) {
        if (isWithin100km(latitude, longitude, user.latitude, user.longitude)) {
          // User is within 100km - notify their emergency contacts
          const contactsReq = pool.request();
          contactsReq.input('user_id', sql.Int, user.id);
          const contactsResult = await contactsReq.query(`
            SELECT related_user_id FROM EmergencyContacts
            WHERE user_id = @user_id AND related_user_id IS NOT NULL
          `);

          const contacts = contactsResult.recordset;

          // Send notification to each contact
          for (const contact of contacts) {
            const notifReq = pool.request();
            notifReq.input('sender_id', sql.Int, user.id);
            notifReq.input('receiver_id', sql.Int, contact.related_user_id);
            notifReq.input('type', sql.NVarChar, 'earthquake_nearby');
            notifReq.input('message', sql.NVarChar, 
              `${user.name} ${location}'de ${magnitude} büyüklüğündeki deprem yakınında bulunuyor.`);

            await notifReq.query(`
              INSERT INTO Notifications (sender_id, receiver_id, type, message, status)
              VALUES (@sender_id, @receiver_id, @type, @message, 'unread')
            `);
          }
        }
      }
    }

    res.json({ 
      message: 'Earthquake recorded',
      id: earthquakeId
    });
  } catch (err) {
    console.error('Add earthquake error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all earthquakes
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();

    const result = await request.query(`
      SELECT * FROM Earthquakes
      ORDER BY earthquake_time DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get earthquakes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET recent earthquakes (last 24 hours, magnitude >= 4.0)
router.get('/recent', async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();

    const result = await request.query(`
      SELECT * FROM Earthquakes
      WHERE magnitude >= 4.0 
        AND earthquake_time >= DATEADD(HOUR, -24, GETDATE())
      ORDER BY earthquake_time DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get recent earthquakes error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
