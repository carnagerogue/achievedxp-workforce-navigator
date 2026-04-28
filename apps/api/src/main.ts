import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Parse cookies before routing — JwtStrategy reads the session cookie via
  // a cookie extractor, which needs `req.cookies` populated.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');

  const isProd = process.env.NODE_ENV === 'production';

  // ── CORS ──
  // Production: explicit allowlist via ALLOWED_ORIGINS (comma-separated).
  //   Browser requests from origins not on the list are refused.
  // Dev: ALLOWED_ORIGINS may be omitted; we reflect any origin so localhost
  //   ports + IDE plugins work without configuration.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProd && allowedOrigins.length === 0) {
    Logger.warn(
      'ALLOWED_ORIGINS is empty in production — denying all browser requests. Set it on the API service.',
      'Bootstrap',
    );
  }
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, server-to-server) send no Origin header — allow.
      if (!origin) return callback(null, true);
      if (!isProd && allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`), false);
    },
    credentials: true,
  });

  // SIGTERM / SIGINT → close HTTP + DB pools cleanly. Important for
  // zero-downtime rollouts in prod.
  app.enableShutdownHooks();

  // ── OpenAPI / Swagger ──
  // Disabled in production by default. Set EXPOSE_API_DOCS=true on the
  // service to override (do this only behind an auth-protected proxy).
  const exposeDocs = !isProd || process.env.EXPOSE_API_DOCS === 'true';
  if (exposeDocs) {
    const swaggerDoc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Achieve DXP · Workforce Navigator')
        .setDescription(
          'REST API for aggregating jobs from multiple providers and matching them ' +
            'to justice-impacted jobseekers. Rule-based, explainable scoring.',
        )
        .setVersion('0.1.0')
        .addTag('health')
        .addTag('jobs')
        .addTag('users')
        .addTag('profile')
        .addTag('matches')
        .addTag('ingestion')
        .addTag('classify')
        .addTag('location')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, swaggerDoc, {
      swaggerOptions: { persistAuthorization: true, tryItOutEnabled: true },
    });
  }

  const cfg = app.get(ConfigService);
  // Railway / Render / Fly inject PORT — honor it first.
  const port = Number(process.env.PORT ?? cfg.get('API_PORT') ?? 3001);
  const host = cfg.get<string>('API_HOST') ?? '0.0.0.0';

  await app.listen(port, host);
  Logger.log(`🚀 API listening on http://${host}:${port}/api/v1`, 'Bootstrap');
  Logger.log(`📚 OpenAPI docs at http://${host}:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
