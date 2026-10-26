import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable graceful shutdown for hosting environments (SIGTERM / SIGINT)
  app.enableShutdownHooks();

  // Ensure uploads directory exists (supports persistent disk mount if configured)
  const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Security gate: Block all direct static requests to private student documents
  app.use((req: Request, res: Response, next: NextFunction) => {
    const pathLower = req.path.toLowerCase();
    if (
      pathLower.startsWith('/uploads/documents') ||
      pathLower.startsWith('/documents/file') ||
      pathLower.startsWith('/v1/uploads/documents')
    ) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Direct access to private student documents is forbidden. Use authorized document endpoints.',
      });
    }
    next();
  });

  // Serve only public static assets (logos, public media, thumbnails)
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // Health Check & Root Route Alias Middleware:
  // Seamlessly route /health to /v1/health for Render health checks, / to /v1, and deduplicate /v1/v1/
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url.startsWith('/v1/v1/')) {
      req.url = req.url.replace(/^\/v1\/v1\//, '/v1/');
    }
    if (req.path === '/health' || req.path === '/health/') {
      req.url = '/v1/health';
    } else if (req.path === '/' || req.path === '') {
      req.url = '/v1';
    } else if (req.path.startsWith('/users/me/shortlist') || req.path.startsWith('/admin/otp-settings')) {
      req.url = `/v1${req.url}`;
    }
    next();
  });

  // Authoritative CORS Configuration
  // Supports comma-separated origin lists, trailing slashes, and localhost dev
  const configuredOrigins = [
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
    ...(process.env.FRONTEND_USER_URL ? process.env.FRONTEND_USER_URL.split(',') : []),
    ...(process.env.ADMIN_URL ? process.env.ADMIN_URL.split(',') : []),
    ...(process.env.ADMIN_PORTAL_URL ? process.env.ADMIN_PORTAL_URL.split(',') : []),
    ...(process.env.ERP_PORTAL_URL ? process.env.ERP_PORTAL_URL.split(',') : []),
    ...(process.env.PORTAL_URL ? process.env.PORTAL_URL.split(',') : []),
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'https://swayam-admission-eg2x.vercel.app',
    'https://swayam-admission.vercel.app',
  ];

  const allowedOrigins = Array.from(
    new Set([...defaultOrigins, ...configuredOrigins]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, mobile, Render health checks)
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/+$/, '');

      try {
        const url = new URL(normalized);
        const host = url.hostname.toLowerCase();
        if (
          allowedOrigins.includes(normalized) ||
          /^http:\/\/(localhost|127\.0\.0\.1):(5173|5174|3000)$/.test(normalized) ||
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === 'swayam-admission-eg2x.vercel.app' ||
          host === 'swayam-admission.vercel.app'
        ) {
          return callback(null, true);
        }
      } catch {
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Access-Token',
      'X-Refresh-Token',
      'Range',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['uploads/(.*)'],
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;

  try {
    await app.listen(port, '0.0.0.0');
    console.log('✅ Backend Started');
    console.log(`🚀 Server listening on 0.0.0.0:${port}`);
    console.log(`🚀 Configured CORS origins: ${allowedOrigins.join(', ')}`);
  } catch (err: unknown) {
    const errorWithCode = err as { code?: string };
    if (errorWithCode?.code === 'EADDRINUSE') {
      console.error(
        `\n[NestApplication Error] Backend port ${port} is already in use.\n` +
          `Another process is listening on port ${port}. Please ensure any stale or duplicate dev server is stopped.\n`,
      );
    } else {
      console.error('[NestApplication Error]', err);
    }
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('[NestApplication Fatal]', err);
  process.exit(1);
});
