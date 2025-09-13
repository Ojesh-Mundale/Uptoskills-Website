// backend/routes/projects.js
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // { query, pool, init }

// Helper to parse integer safely
const toInt = (v, fallback = 0) => {
  if (v === undefined || v === null) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, title, mentor, students FROM projects ORDER BY id ASC;');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/projects error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { title, mentor } = req.body;
    const students = toInt(req.body.students, 0);

    if (!title || !mentor) {
      return res.status(400).json({ message: 'title and mentor are required' });
    }

    const insertSQL = `
      INSERT INTO projects (title, mentor, students, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      RETURNING id, title, mentor, students;
    `;
    const result = await db.query(insertSQL, [title, mentor, students]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/projects error:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// PUT /api/projects/:id (full update)
router.put('/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id, null);
    if (id === null) return res.status(400).json({ message: 'Invalid id' });

    const { title, mentor } = req.body;
    const students = req.body.students !== undefined ? toInt(req.body.students, 0) : undefined;

    const exist = await db.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (exist.rowCount === 0) return res.status(404).json({ message: 'Project not found' });

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (mentor !== undefined) {
      fields.push(`mentor = $${idx++}`);
      values.push(mentor);
    }
    if (students !== undefined) {
      fields.push(`students = $${idx++}`);
      values.push(students);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    fields.push('updated_at = now()');
    const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, title, mentor, students;`;
    values.push(id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/projects/:id error:', err);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// PATCH /api/projects/:id/students (only students count)
router.patch('/:id/students', async (req, res) => {
  try {
    const id = toInt(req.params.id, null);
    if (id === null) return res.status(400).json({ message: 'Invalid id' });

    const students = toInt(req.body.students, null);
    if (students === null) {
      return res.status(400).json({ message: 'students is required and must be a number' });
    }

    const result = await db.query(
      'UPDATE projects SET students = $1, updated_at = now() WHERE id = $2 RETURNING id, title, mentor, students;',
      [students, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/projects/:id/students error:', err);
    res.status(500).json({ message: 'Failed to update students' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = toInt(req.params.id, null);
    if (id === null) return res.status(400).json({ message: 'Invalid id' });

    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Project not found' });
    res.json({ ok: true, message: 'Project deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
