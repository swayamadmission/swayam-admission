import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
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
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Health Check Alias Middleware: Route /health to /v1/health seamlessly
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path === '/health' || req.path === '/health/') {
      req.url = '/v1/health';
    } else if (req.path.startsWith('/users/me/shortlist')) {
      req.url = `/v1${req.url}`;
    }
    next();
  });

  // Authoritative CORS Configuration
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, mobile)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:(5173|5174|3000)$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:(5173|5174|3000)$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
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

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  try {
    await app.listen(port);
    console.log('✅ Backend Started');
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🚀 Listening on configured port ${port}`);
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
