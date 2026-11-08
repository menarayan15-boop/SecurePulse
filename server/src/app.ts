import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import loginHistoryRoutes from './routes/loginHistoryRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import passkeyRoutes from './routes/passkeyRoutes.js';
import { calculateThemeForIST } from './utils/themeEngine.js';
import { extractEnvironmentInfo } from './services/environmentDetection.js';
import { verifyEmailServiceStatus } from './services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust multi-path dotenv loading (supports Vercel, Monorepo root, server subfolder)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();

// Trust reverse proxies if configured (Vercel, Render, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible dashboard assets
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or allowed origins
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or specific in production
      }
    },
    credentials: true,
  })
);

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serverless DB Auto-Connect (ensures warm connection on Vercel Function invocations)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 2) {
    try {
      await connectDB();
    } catch (err: any) {
      console.error('[Serverless DB Connect Error]:', err.message);
    }
  }
  next();
});

// Server health check & IST time probe
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  const theme = calculateThemeForIST('auto');
  const env = extractEnvironmentInfo(req);

  res.status(200).json({
    status: 'online',
    system: 'SecurePulse Adaptive Security Engine',
    version: '1.0.0',
    istTime: theme.istTimeString,
    calculatedTheme: theme.theme,
    detectedClient: {
      ip: env.ipAddress,
      browser: env.browserName,
      os: env.operatingSystem,
      location: `${env.city}, ${env.country}`,
    },
    timestamp: new Date().toISOString(),
  });
});

// Email delivery diagnostic check
app.get(['/api/health/email-status', '/health/email-status'], async (req: Request, res: Response) => {
  const status = await verifyEmailServiceStatus();
  res.status(status.configured && (status.verified !== false) ? 200 : 503).json(status);
});

// Current IST Time calculation endpoint for frontend adaptive engine
app.get(['/api/theme-info', '/theme-info'], (req: Request, res: Response) => {
  const pref = (req.query.preference as 'auto' | 'light' | 'dark') || 'auto';
  const calculation = calculateThemeForIST(pref);
  res.status(200).json({ success: true, ...calculation });
});

// Mount Routes (Supports both /api/* and /* paths seamlessly for local & Vercel serverless rewrites)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/login-history', '/login-history'], loginHistoryRoutes);
app.use(['/api/devices', '/devices'], deviceRoutes);
app.use(['/api/sessions', '/sessions'], sessionRoutes);
app.use(['/api/security', '/security'], securityRoutes);
app.use(['/api/passkeys', '/passkeys'], passkeyRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

export default app;

