const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const token = auth.split(' ')[1];
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
};

router.use(authMiddleware);

// Get user notifications
router.get('/', async (req, res) => {
  const { user_id } = req.user || req.query;
  try {
    const result = await pool.query(
      `SELECT notification_id, type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Mark notification as read
router.post('/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read=true, read_at=now()
       WHERE notification_id=$1
       RETURNING notification_id, is_read`,
      [notificationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Delete notification
router.delete('/:notificationId', async (req, res) => {
  const { notificationId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE notification_id=$1 RETURNING notification_id',
      [notificationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
