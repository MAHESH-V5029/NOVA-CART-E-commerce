const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function makeToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Add it to your .env file.');
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'user\')',
      [name, email, passwordHash]
    );
    const user = { id: result.insertId, name, email, role: 'user' };
    return res.status(201).json({ message: 'Account created successfully.', token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await pool.execute('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    return res.json({ message: 'Login successful.', token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ message: 'Account not found. Please log in again.' });
    return res.json({ user: publicUser(rows[0]) });
  } catch (error) { return next(error); }
});

module.exports = router;
