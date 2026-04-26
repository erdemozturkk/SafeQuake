const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const sql = require('mssql');

const router = express.Router();

// POST send "I'm safe" notification to all contacts
router.post('/send-safe', authenticate, async (req, res) => {
  try {
    const sender_id = req.userId;
    const pool = getPool();

    // Get all emergency contacts for this user
    const contactsRequest = pool.request();
    contactsRequest.input('user_id', sql.Int, sender_id);

    const contactsResult = await contactsRequest.query(`
      SELECT 
        related_user_id AS contact_user_id,
        name AS contact_name
      FROM EmergencyContacts
      WHERE user_id = @user_id AND related_user_id IS NOT NULL
    `);

    const contacts = contactsResult.recordset;

    if (contacts.length === 0) {
      return res.status(400).json({ 
        error: 'Hiç kontakt bulunamadı',
        message: 'Bildirim göndermek için lütfen kontaktlar ekleyin'
      });
    }

    // Get sender info
    const senderRequest = pool.request();
    senderRequest.input('sender_id', sql.Int, sender_id);
    const senderResult = await senderRequest.query(`
      SELECT name FROM Users WHERE id = @sender_id
    `);

    const senderName = senderResult.recordset[0]?.name || 'Kullanıcı';
    const message = `${senderName} şimdi güvende olduğunu bildirdi.`;

    // Send notification to all contacts
    let successCount = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        const notifRequest = pool.request();
        notifRequest.input('sender_id', sql.Int, sender_id);
        notifRequest.input('receiver_id', sql.Int, contact.contact_user_id);
        notifRequest.input('type', sql.NVarChar, 'safety_status');
        notifRequest.input('message', sql.NVarChar, message);

        await notifRequest.query(`
          INSERT INTO Notifications (sender_id, receiver_id, type, message)
          VALUES (@sender_id, @receiver_id, @type, @message)
        `);

        successCount++;
      } catch (err) {
        errors.push({ contact_id: contact.contact_user_id, error: err.message });
      }
    }

    res.json({
      message: 'Bildirimleri gönder başarılı',
      sent_to_count: successCount,
      total_contacts: contacts.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Send safe notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all unread notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const receiver_id = req.userId;
    const pool = getPool();
    const request = pool.request();
    request.input('receiver_id', sql.Int, receiver_id);

    const result = await request.query(`
      SELECT 
        n.id,
        n.sender_id,
        n.receiver_id,
        n.type,
        n.message,
        n.status,
        n.created_at,
        u.name as sender_name,
        u.phone as sender_phone
      FROM Notifications n
      JOIN Users u ON n.sender_id = u.id
      WHERE n.receiver_id = @receiver_id
      ORDER BY n.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET unread notifications count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const receiver_id = req.userId;
    const pool = getPool();
    const request = pool.request();
    request.input('receiver_id', sql.Int, receiver_id);

    const result = await request.query(`
      SELECT COUNT(*) as unread_count
      FROM Notifications
      WHERE receiver_id = @receiver_id AND status = 'unread'
    `);

    const unreadCount = result.recordset[0].unread_count;
    res.json({ unread_count: unreadCount });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification_id = req.params.id;
    const receiver_id = req.userId;

    const pool = getPool();
    const request = pool.request();
    request.input('id', sql.Int, notification_id);
    request.input('receiver_id', sql.Int, receiver_id);

    await request.query(`
      UPDATE Notifications
      SET status = 'read'
      WHERE id = @id AND receiver_id = @receiver_id
    `);

    res.json({ message: 'Bildirim okundu olarak işaretlendi' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification_id = req.params.id;
    const receiver_id = req.userId;

    const pool = getPool();
    const request = pool.request();
    request.input('id', sql.Int, notification_id);
    request.input('receiver_id', sql.Int, receiver_id);

    await request.query(`
      DELETE FROM Notifications
      WHERE id = @id AND receiver_id = @receiver_id
    `);

    res.json({ message: 'Bildirim silindi' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
