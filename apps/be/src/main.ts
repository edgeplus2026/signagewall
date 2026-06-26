import './load-env';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { setupSwagger } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const apiPrefix = configService.getOrThrow<string>('apiPrefix');
  const frontendUrl = configService.getOrThrow<string>('frontendUrl');
  const playerUrl = configService.getOrThrow<string>('playerUrl');
  const port = configService.getOrThrow<number>('port');
  const nodeEnv = configService.getOrThrow<string>('nodeEnv');
  const swaggerEnabled =
    configService.get<boolean>('swagger.enabled') ?? nodeEnv !== 'production';

  app.setGlobalPrefix(apiPrefix);

  // URI versioning: routes are served under `/<apiPrefix>/v1/...` by default.
  // Operational routes (e.g. health) opt out via `@Version(VERSION_NEUTRAL)`.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(
    helmet({
      contentSecurityPolicy: swaggerEnabled ? false : undefined,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // The CMS (frontendUrl) uses cookie-backed credentials; the player (playerUrl)
  // authenticates with a Bearer device token and needs no credentials, but its
  // origin must still be allowed for the `/player/*` REST fallback routes.
  app.enableCors({
    origin: [frontendUrl, playerUrl],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (swaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(port);
}

void bootstrap();
