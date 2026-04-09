const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const sql = require('mssql');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({ error: 'Name, email/phone, and password required' });
    }

    const pool = getPool();
    const hashedPassword = await bcrypt.hash(password, 10);

    const request = pool.request();
    request.input('name', sql.NVarChar, name);
    request.input('email', sql.NVarChar, email || null);
    request.input('phone', sql.NVarChar, phone || null);
    request.input('password_hash', sql.NVarChar, hashedPassword);

    const query = `
      INSERT INTO Users (name, email, phone, password_hash)
      VALUES (@name, @email, @phone, @password_hash);
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await request.query(query);
    const userId = result.recordset[0].id;

    // Create default preferences
    const prefRequest = pool.request();
    prefRequest.input('user_id', sql.Int, userId);
    await prefRequest.query(`
      INSERT INTO UserPreferences (user_id, min_magnitude, notifications_enabled)
      VALUES (@user_id, 4.0, 1)
    `);

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.json({ 
      message: 'User registered successfully',
      token,
      user: { id: userId, name, email, phone }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ error: 'Email/phone and password required' });
    }

    const pool = getPool();
    const request = pool.request();

    let query = 'SELECT id, password_hash, name, email, phone FROM Users WHERE ';
    
    if (email) {
      request.input('email', sql.NVarChar, email);
      query += 'email = @email';
    } else {
      request.input('phone', sql.NVarChar, phone);
      query += 'phone = @phone';
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.json({ 
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
