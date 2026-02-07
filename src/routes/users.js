const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');

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

// List all users (creator only)
router.get('/', async (req, res) => {
  const { role, county, limit = 100 } = req.query;
  try {
    let query = 'SELECT user_id, username, email, phone, role, trust_score, created_at FROM users WHERE is_deleted=false';
    const params = [];
    
    if (role) {
      query += ' AND role=$' + (params.length + 1);
      params.push(role);
    }
    
    query += ' LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Get single user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT user_id, username, email, phone, role, trust_score, reports_count, created_at FROM users WHERE user_id=$1 LIMIT 1',
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Promote user to admin
router.post('/:userId/promote', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET role=$1, updated_at=now() WHERE user_id=$2 RETURNING user_id, role',
      ['ADMIN', userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Suspend user
router.post('/:userId/suspend', body('reason').optional(), async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET role=$1, updated_at=now() WHERE user_id=$2 RETURNING user_id',
      ['SUSPENDED', userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { suspended: true } });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Unsuspend user
router.post('/:userId/unsuspend', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET role=$1, updated_at=now() WHERE user_id=$2 RETURNING user_id',
      ['USER', userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { unsuspended: true } });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Delete user (soft delete)
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET is_deleted=true, deleted_at=now() WHERE user_id=$1 RETURNING user_id',
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Get analytics dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users WHERE is_deleted=false');
    const reports = await pool.query('SELECT COUNT(*) FROM reports WHERE is_deleted=false');
    const verified = await pool.query('SELECT COUNT(*) FROM reports WHERE status=$1', ['VERIFIED']);
    const facilities = await pool.query('SELECT COUNT(*) FROM public_facilities WHERE is_active=true');
    
    res.json({
      data: {
        total_users: parseInt(users.rows[0].count),
        total_reports: parseInt(reports.rows[0].count),
        verified_reports: parseInt(verified.rows[0].count),
        total_facilities: parseInt(facilities.rows[0].count),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
