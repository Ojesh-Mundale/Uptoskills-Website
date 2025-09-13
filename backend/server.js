// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./config/database'); // exports { query, pool, init }
const projectsRouter = require('./routes/projects');
const mentorReviewsRouter = require("./routes/mentorReviews");

const app = express();
const PORT = process.env.PORT || 5000;

// Basic request logging to help debug 404s / paths
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api/projects', projectsRouter);
app.use("/api/mentor-reviews", mentorReviewsRouter);

// Health route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (for unmatched API routes)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// Start server after ensuring DB connection/init
(async () => {
  try {
    // Check DB connection and create table if missing
    await db.init();
    console.log('Database initialized or already present.');
  } catch (err) {
    console.error('Error connecting to the database during init:', err);
    // continue to start server, but you'll see errors on DB queries
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
  });
})();
