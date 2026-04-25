import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });

  // SIGTERM / SIGINT → close HTTP + DB pools cleanly. Important for
  // zero-downtime rollouts in prod.
  app.enableShutdownHooks();

  // ── OpenAPI / Swagger ──
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

  const cfg = app.get(ConfigService);
  // Railway / Render / Fly inject PORT — honor it first.
  const port = Number(process.env.PORT ?? cfg.get('API_PORT') ?? 3001);
  const host = cfg.get<string>('API_HOST') ?? '0.0.0.0';

  await app.listen(port, host);
  Logger.log(`🚀 API listening on http://${host}:${port}/api/v1`, 'Bootstrap');
  Logger.log(`📚 OpenAPI docs at http://${host}:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
