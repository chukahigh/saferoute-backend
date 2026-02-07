const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

router.post('/register',
  body('email').isEmail().optional({ nullable: true }),
  body('password').isLength({ min: 6 }).optional({ nullable: true }),
  body('username').isLength({ min: 3 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, phone, password } = req.body;
    try {
      const exists = await pool.query('SELECT user_id FROM users WHERE username=$1 OR email=$2 OR phone=$3 LIMIT 1', [username, email, phone]);
      if (exists.rows.length) return res.status(409).json({ error: 'user_exists' });

      const password_hash = password ? await bcrypt.hash(password, 10) : null;
      const result = await pool.query(
        'INSERT INTO users (username, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING user_id, username, email, role, created_at',
        [username, email, phone, password_hash]
      );
      const user = result.rows[0];
      const token = jwt.sign({ sub: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ user, token });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

router.post('/login',
  body('password').exists(),
  body('username').exists(),
  async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query('SELECT user_id, password_hash, role, username, email FROM users WHERE username=$1 LIMIT 1', [username]);
      if (!result.rows.length) return res.status(401).json({ error: 'invalid_credentials' });
      const user = result.rows[0];
      if (!user.password_hash) return res.status(400).json({ error: 'no_password_set' });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
      const token = jwt.sign({ sub: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ user: { user_id: user.user_id, username: user.username, email: user.email }, token });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

module.exports = router;
