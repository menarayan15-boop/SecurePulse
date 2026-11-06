import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import loginHistoryRoutes from './routes/loginHistoryRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import { calculateThemeForIST } from './utils/themeEngine.js';
import { extractEnvironmentInfo } from './services/environmentDetection.js';

dotenv.config();

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

// Server health check & IST time probe
app.get('/api/health', (req: Request, res: Response) => {
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

// Current IST Time calculation endpoint for frontend adaptive engine
app.get('/api/theme-info', (req: Request, res: Response) => {
  const pref = (req.query.preference as 'auto' | 'light' | 'dark') || 'auto';
  const calculation = calculateThemeForIST(pref);
  res.status(200).json({ success: true, ...calculation });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/security', securityRoutes);

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
