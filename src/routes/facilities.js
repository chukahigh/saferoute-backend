const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

// List all facilities
router.get('/', async (req, res) => {
  const { type, county, radius, lat, lng } = req.query;
  try {
    let query = 'SELECT facility_id, name, facility_type, address, county, phone FROM public_facilities WHERE is_active=true';
    const params = [];
    
    if (type) {
      query += ' AND facility_type=$' + (params.length + 1);
      params.push(type);
    }
    if (county) {
      query += ' AND county=$' + (params.length + 1);
      params.push(county);
    }
    
    query += ' LIMIT 100';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Get single facility
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM public_facilities WHERE facility_id=$1 LIMIT 1',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Create facility (admin)
router.post('/',
  body('name').isString(),
  body('facility_type').isIn(['HEALTH_CENTER', 'FIRE_STATION', 'COUNTY_OFFICE']),
  body('county').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, facility_type, address, county, phone, email, lat, lng } = req.body;
    try {
      const id = uuidv4();
      let location = null;
      if (lat && lng) {
        location = `SRID=4326;POINT(${lng} ${lat})`;
      }
      const result = await pool.query(
        `INSERT INTO public_facilities (facility_id, name, facility_type, address, county, phone, email, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7, ${location ? "ST_GeogFromText($8)" : 'NULL'})
         RETURNING facility_id, name, facility_type`,
        location ? [id, name, facility_type, address, county, phone, email, location] 
                : [id, name, facility_type, address, county, phone, email]
      );
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Update facility
router.put('/:id',
  async (req, res) => {
    const { id } = req.params;
    const { name, address, phone, email } = req.body;
    try {
      const result = await pool.query(
        `UPDATE public_facilities 
         SET name=$1, address=$2, phone=$3, email=$4, updated_at=now()
         WHERE facility_id=$5
         RETURNING facility_id, name`,
        [name, address, phone, email, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
      res.json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }
);

// Delete facility
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE public_facilities SET is_active=false WHERE facility_id=$1 RETURNING facility_id',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { deleted: true } });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
