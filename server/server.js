#!/usr/bin/env node
/**
 * AttendSecure Express Backend Server Entry Point
 */
import dotenv from 'dotenv';
dotenv.config({ override: true, quiet: true });
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import studentRouter from './routes/student.js';
import facultyRouter from './routes/faculty.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/faculty', facultyRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', app: 'AttendSecure Server', time: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[AttendSecure Backend] API running on http://localhost:${PORT}`);
  });
}

export default app;
