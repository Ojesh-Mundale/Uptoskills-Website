// backend/routes/mentorReviews.js
const express = require("express");
const router = express.Router();
const db = require("../config/database"); // { query, pool, init }

// Helper to parse integer safely (and floats)
const toFloat = (v, fallback = null) => {
  if (v === undefined || v === null) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

// GET /api/mentor-reviews
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT id, mentor, feedback, rating FROM mentor_reviews ORDER BY id ASC;");
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/mentor-reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/mentor-reviews
router.post("/", async (req, res) => {
  try {
    const { mentor, feedback } = req.body;
    const rating = toFloat(req.body.rating, null);

    if (!mentor || !feedback || rating === null) {
      return res.status(400).json({ message: "mentor, feedback and rating are required" });
    }
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 0 and 5" });
    }

    const insertSQL = `
      INSERT INTO mentor_reviews (mentor, feedback, rating, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      RETURNING id, mentor, feedback, rating;
    `;
    const result = await db.query(insertSQL, [mentor, feedback, rating]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/mentor-reviews error:", err);
    res.status(500).json({ message: "Failed to create review" });
  }
});

// DELETE /api/mentor-reviews/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await db.query("DELETE FROM mentor_reviews WHERE id = $1 RETURNING id;", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Review not found" });
    res.json({ ok: true, message: "Review deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /api/mentor-reviews/:id error:", err);
    res.status(500).json({ message: "Failed to delete review" });
  }
});

module.exports = router;
