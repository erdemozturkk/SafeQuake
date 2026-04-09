const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const sql = require('mssql');

const router = express.Router();

// GET all users except current user
router.get('/users', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);

    const result = await request.query(`
      SELECT id, name, email, phone, created_at
      FROM Users
      WHERE id != @user_id
      ORDER BY created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST send contact request
router.post('/send', authenticate, async (req, res) => {
  try {
    const { receiver_id } = req.body;
    const sender_id = req.userId;

    if (!receiver_id) {
      return res.status(400).json({ error: 'Receiver ID required' });
    }

    if (sender_id === receiver_id) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('sender_id', sql.Int, sender_id);
    request.input('receiver_id', sql.Int, receiver_id);

    const result = await request.query(`
      INSERT INTO ContactRequests (sender_id, receiver_id, status)
      VALUES (@sender_id, @receiver_id, 'pending');
      SELECT SCOPE_IDENTITY() as id;
    `);

    res.json({ 
      message: 'Contact request sent successfully',
      request_id: result.recordset[0].id
    });
  } catch (err) {
    console.error('Send request error:', err);
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Request already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET pending requests for current user
router.get('/pending', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();
    request.input('receiver_id', sql.Int, req.userId);

    const result = await request.query(`
      SELECT 
        r.id,
        r.sender_id,
        r.receiver_id,
        r.status,
        r.created_at,
        u.name as sender_name,
        u.email as sender_email,
        u.phone as sender_phone
      FROM ContactRequests r
      JOIN Users u ON r.sender_id = u.id
      WHERE r.receiver_id = @receiver_id AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT accept/reject request
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const request_id = req.params.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('id', sql.Int, request_id);
    request.input('receiver_id', sql.Int, req.userId);
    request.input('status', sql.NVarChar, status);

    // Get the request details
    const getRequest = pool.request();
    getRequest.input('id', sql.Int, request_id);
    getRequest.input('receiver_id', sql.Int, req.userId);
    const requestData = await getRequest.query(`
      SELECT sender_id, receiver_id FROM ContactRequests
      WHERE id = @id AND receiver_id = @receiver_id
    `);

    if (requestData.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { sender_id, receiver_id } = requestData.recordset[0];

    const userLookup = pool.request();
    userLookup.input('sender_id', sql.Int, sender_id);
    userLookup.input('receiver_id', sql.Int, receiver_id);

    const usersResult = await userLookup.query(`
      SELECT id, name, phone
      FROM Users
      WHERE id IN (@sender_id, @receiver_id)
    `);

    const senderUser = usersResult.recordset.find((user) => user.id === sender_id);
    const receiverUser = usersResult.recordset.find((user) => user.id === receiver_id);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ error: 'User details not found' });
    }

    // Update request status
    const updateReq = pool.request();
    updateReq.input('id', sql.Int, request_id);
    updateReq.input('status', sql.NVarChar, status);
    await updateReq.query(`
      UPDATE ContactRequests SET status = @status WHERE id = @id
    `);

    // If accepted, add to both users' contacts
    if (status === 'accepted') {
      const addContact1 = pool.request();
      addContact1.input('user_id', sql.Int, sender_id);
      addContact1.input('name', sql.NVarChar, receiverUser.name || 'Contact');
      addContact1.input('phone', sql.NVarChar, receiverUser.phone || '');

      await addContact1.query(`
        INSERT INTO EmergencyContacts (user_id, name, phone)
        SELECT @user_id, @name, @phone
        WHERE NOT EXISTS (
          SELECT 1 FROM EmergencyContacts
          WHERE user_id = @user_id AND name = @name AND phone = @phone
        )
      `);

      const addContact2 = pool.request();
      addContact2.input('user_id', sql.Int, receiver_id);
      addContact2.input('name', sql.NVarChar, senderUser.name || 'Contact');
      addContact2.input('phone', sql.NVarChar, senderUser.phone || '');

      await addContact2.query(`
        INSERT INTO EmergencyContacts (user_id, name, phone)
        SELECT @user_id, @name, @phone
        WHERE NOT EXISTS (
          SELECT 1 FROM EmergencyContacts
          WHERE user_id = @user_id AND name = @name AND phone = @phone
        )
      `);
    }

    res.json({ message: `Request ${status} successfully` });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
