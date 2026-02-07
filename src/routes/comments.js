const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

// Create comment on report
router.post('/:reportId/comments',
  body('comment_text').isLength({ min: 1, max: 500 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { reportId } = req.params;
    const { comment_text, user_id } = req.body;
    try {
      const id = uuidv4();
      const result = await pool.query(
        `INSERT INTO comments (comment_id, report_id, user_id, comment_text)
         VALUES ($1,$2,$3,$4)
         RETURNING comment_id, comment_text, created_at`,
        [id, reportId, user_id, comment_text]
      );
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Get comments on report
router.get('/:reportId/comments', async (req, res) => {
  const { reportId } = req.params;
  try {
    const result = await pool.query(
      'SELECT comment_id, comment_text, upvotes, downvotes, created_at FROM comments WHERE report_id=$1 ORDER BY created_at DESC LIMIT 100',
      [reportId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Upvote or downvote a report
router.post('/:reportId/vote',
  body('vote_type').isIn(['UPVOTE', 'DOWNVOTE']),
  async (req, res) => {
    const { reportId } = req.params;
    const { vote_type, user_id } = req.body;
    try {
      const column = vote_type === 'UPVOTE' ? 'upvotes' : 'downvotes';
      const result = await pool.query(
        `UPDATE reports SET ${column}=${column}+1 WHERE report_id=$1 RETURNING report_id, upvotes, downvotes`,
        [reportId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Flag inappropriate report
router.post('/:reportId/flag',
  body('reason').optional(),
  async (req, res) => {
    const { reportId } = req.params;
    const { reason } = req.body;
    try {
      res.json({ data: { flagged: true, reason } });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

module.exports = router;
