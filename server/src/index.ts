import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sendSuccess, sendNotFound } from './utils/response';
import authRoutes from './routes/auth';
import teamRoutes from './routes/teams';
import projectRoutes from './routes/projects';
import invitationRoutes, { teamInvitationRouter } from './routes/invitations';

// Security middleware
import { requestIdMiddleware, requestTimingMiddleware } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  configureHelmet,
  generalRateLimiter,
  preventParameterPollution,
  apiSecurityHeaders,
} from './middleware/security';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ===========================================
// Middleware Configuration (in order of execution)
// ===========================================

// 1. Request ID and timing (for debugging and audit logs)
app.use(requestIdMiddleware);
app.use(requestTimingMiddleware);

// 2. Security headers (Helmet with CSP)
app.use(configureHelmet());

// 3. Additional security headers for API
app.use(apiSecurityHeaders);

// 4. Request logging (Morgan)
app.use(morgan(isProduction ? 'combined' : 'dev'));

// 5. CORS configuration with specific origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  })
);

// 6. Cookie parsing
app.use(cookieParser());

// 7. Rate limiting (general)
app.use(generalRateLimiter);

// 8. Body parsing with size limits
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

// 9. Prevent parameter pollution
app.use(preventParameterPollution);

// 10. Serve uploaded files (static files)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===========================================
// API Routes
// ===========================================

// Auth routes
app.use('/api/v1/auth', authRoutes);

// Team routes
app.use('/api/v1/teams', teamRoutes);

// Invitation routes (token-based: accept, reject, validate)
app.use('/api/v1/invitations', invitationRoutes);

// Team invitation routes (nested under teams)
app.use('/api/v1/teams/:teamId/invitations', teamInvitationRouter);

// Project routes (handles both /teams/:teamId/projects and /projects/:projectId)
app.use('/api/v1', projectRoutes);

// Health check endpoint (v1)
app.get('/api/v1/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Legacy health check (for backwards compatibility)
app.get('/api/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ===========================================
// Error Handling
// ===========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (enhanced with sanitization)
app.use(errorHandler);

// ===========================================
// Server Startup
// ===========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Version: v1`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🛡️  Security: Enhanced error handling, CSP, rate limiting active`);
});

export default app;
