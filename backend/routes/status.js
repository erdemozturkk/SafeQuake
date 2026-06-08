const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../config/database');
const sql = require('mssql');

// POST submit safe status report
router.post('/report', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, status } = req.body;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const validStatuses = ['safe', 'injured', 'trapped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: safe, injured, or trapped' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);
    request.input('latitude', sql.Float, parseFloat(latitude));
    request.input('longitude', sql.Float, parseFloat(longitude));
    request.input('status', sql.NVarChar, status);

    // Insert safe status report
    await request.query(`
      INSERT INTO SafeStatusReports (user_id, latitude, longitude, status)
      VALUES (@user_id, @latitude, @longitude, @status)
    `);

    // Get user info for notifications
    const userResult = await request.query(`
      SELECT id, name, phone FROM Users WHERE id = @user_id
    `);

    const user = userResult.recordset[0];

    // Get all emergency contacts
    const contactsResult = await request.query(`
      SELECT id, related_user_id FROM EmergencyContacts WHERE user_id = @user_id
    `);

    const contacts = contactsResult.recordset;

    // Create notifications for all emergency contacts
    const statusMessages = {
      safe: '✅ Güvende olduğunu bildirdi',
      injured: '⚠️ Yaralandığını bildirdi',
      trapped: '🆘 Sıkışmış olduğunu bildirdi',
    };

    if (contacts.length > 0) {
      // Insert notifications for each contact who has a related_user_id (is mutual contact)
      for (const contact of contacts) {
        if (contact.related_user_id) {
          const notifRequest = pool.request();
          notifRequest.input('sender_id', sql.Int, req.userId);
          notifRequest.input('receiver_id', sql.Int, contact.related_user_id);
          notifRequest.input('message', sql.NVarChar, statusMessages[status]);
          notifRequest.input('type', sql.NVarChar, 'safe_status_report');
          
          await notifRequest.query(`
            INSERT INTO Notifications (sender_id, receiver_id, message, type)
            VALUES (@sender_id, @receiver_id, @message, @type)
          `);
        }
      }
    }

    res.json({
      message: 'Status report submitted successfully',
      status,
      notified_contacts: contacts.filter(c => c.related_user_id).length,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error('Safe status report error:', error);
    res.status(500).json({ error: 'Failed to submit status report', details: error.message });
  }
});

module.exports = router;
