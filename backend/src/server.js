const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const timesheetRoutes = require('./routes/timesheet.routes');
const leaveRoutes     = require('./routes/leave.routes');
const reportRoutes    = require('./routes/report.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

// ─── Security Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate Limiting ──────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
}));

// ─── Health Check (used by K8s livenessProbe + readinessProbe) ──
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'timesheet-backend',
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/leaves',    leaveRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/admin',     adminRoutes);

// ─── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── MongoDB Connection ──────────────────────────────────────────
// In K8s: MONGO_URI=mongodb://mongo-service:27017/timesheet_db
// mongo-service is the K8s Service name defined in 01-mongodb.yaml
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${process.env.MONGO_URI}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// ─── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

// Graceful shutdown — K8s sends SIGTERM before killing pod
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
