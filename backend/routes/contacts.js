const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const sql = require('mssql');

const router = express.Router();

// GET all contacts for user
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);

    const result = await request.query(`
      SELECT
        c.id,
        c.user_id,
        COALESCE(u.id, TRY_CONVERT(INT, c.name), TRY_CONVERT(INT, c.phone)) AS related_user_id,
        COALESCE(u.name, c.name) AS name,
        COALESCE(NULLIF(u.phone, ''), c.phone) AS phone,
        c.created_at
      FROM EmergencyContacts c
      LEFT JOIN Users u
        ON u.id = TRY_CONVERT(INT, c.name)
        OR u.id = TRY_CONVERT(INT, c.phone)
      WHERE c.user_id = @user_id
      ORDER BY c.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST add new contact
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone required' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('user_id', sql.Int, req.userId);
    request.input('name', sql.NVarChar, name);
    request.input('phone', sql.NVarChar, phone);

    const result = await request.query(`
      INSERT INTO EmergencyContacts (user_id, name, phone)
      VALUES (@user_id, @name, @phone);
      SELECT SCOPE_IDENTITY() as id;
    `);

    const contactId = result.recordset[0].id;

    res.json({ 
      message: 'Contact added successfully',
      contact: { id: contactId, user_id: req.userId, name, phone, created_at: new Date() }
    });
  } catch (err) {
    console.error('Add contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update contact
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const contactId = req.params.id;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone required' });
    }

    const pool = getPool();
    const request = pool.request();
    request.input('id', sql.Int, contactId);
    request.input('user_id', sql.Int, req.userId);
    request.input('name', sql.NVarChar, name);
    request.input('phone', sql.NVarChar, phone);

    await request.query(`
      UPDATE EmergencyContacts 
      SET name = @name, phone = @phone
      WHERE id = @id AND user_id = @user_id
    `);

    res.json({ 
      message: 'Contact updated successfully',
      contact: { id: contactId, user_id: req.userId, name, phone }
    });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE contact
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const contactId = req.params.id;

    const pool = getPool();
    const request = pool.request();
    request.input('id', sql.Int, contactId);
    request.input('user_id', sql.Int, req.userId);

    await request.query(`
      DELETE FROM EmergencyContacts 
      WHERE id = @id AND user_id = @user_id
    `);

    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
