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

// Get pending reports for verification (admin only)
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT report_id, title, description, severity, county, created_at, upvotes 
       FROM reports WHERE status='PENDING_VERIFICATION' 
       ORDER BY severity DESC, created_at ASC LIMIT 100`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Verify report (mark as accurate)
router.post('/:reportId/verify',
  body('notes').optional({ nullable: true }),
  async (req, res) => {
    const { reportId } = req.params;
    const { notes } = req.body;
    try {
      const result = await pool.query(
        `UPDATE reports 
         SET status='VERIFIED', updated_at=now() 
         WHERE report_id=$1 
         RETURNING report_id, status, updated_at`,
        [reportId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Reject report
router.post('/:reportId/reject',
  body('reason').isString(),
  async (req, res) => {
    const { reportId } = req.params;
    const { reason } = req.body;
    try {
      const result = await pool.query(
        `UPDATE reports 
         SET status='REJECTED', updated_at=now() 
         WHERE report_id=$1 
         RETURNING report_id, status`,
        [reportId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Get admin stats
router.get('/stats', async (req, res) => {
  try {
    const verified = await pool.query('SELECT COUNT(*) FROM reports WHERE status=$1', ['VERIFIED']);
    const pending = await pool.query('SELECT COUNT(*) FROM reports WHERE status=$1', ['PENDING_VERIFICATION']);
    const rejected = await pool.query('SELECT COUNT(*) FROM reports WHERE status=$1', ['REJECTED']);
    res.json({
      data: {
        verified: parseInt(verified.rows[0].count),
        pending: parseInt(pending.rows[0].count),
        rejected: parseInt(rejected.rows[0].count),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
