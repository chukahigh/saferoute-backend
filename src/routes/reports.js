const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

// Create report
router.post('/',
  body('title').isLength({ min: 3 }),
  body('report_type').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, description, report_type, severity, lat, lng, county } = req.body;
    try {
      const id = uuidv4();
      let location = null;
      if (lat && lng) {
        location = `SRID=4326;POINT(${lng} ${lat})`;
      }
      const result = await pool.query(
        `INSERT INTO reports (report_id, report_type, severity, title, description, location, county)
         VALUES ($1,$2,$3,$4,$5, ${location ? "ST_GeogFromText($6)" : 'NULL'}, $7)
         RETURNING report_id, title, severity, created_at`,
        location ? [id, report_type, severity || 'LOW', title, description, location, county] : [id, report_type, severity || 'LOW', title, description, null, county]
      );
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// List reports (basic)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT report_id, title, severity, county, created_at FROM reports ORDER BY created_at DESC LIMIT 200');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Get single report
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT report_id, title, description, severity, county, created_at FROM reports WHERE report_id=$1 LIMIT 1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
