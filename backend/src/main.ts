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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['uploads/(.*)'],
  });

  app.enableCors();

  await app.listen(3000);

  console.log('🚀 Server running on http://localhost:3000');
}

void bootstrap();
