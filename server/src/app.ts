import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRouter from './routes/api.router.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// ─── Request parsing ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials: true is required so the browser sends the HttpOnly refresh-token
// cookie on cross-origin requests to the API.
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// ─── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorMiddleware);

export default app;
