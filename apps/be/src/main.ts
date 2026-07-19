import './load-env';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { setupSwagger } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Raise the JSON body limit above Express's 100kb default: an app instance's
  // config can carry an inline file, and the PDF Reader app stores an uploaded
  // PDF as a base64 data URL (up to 10MB → ~13.3MB encoded). 15mb leaves headroom
  // for that plus the rest of the config. Keep this in step with the largest
  // `file` field `maxSizeMb` across the app catalog.
  app.useBodyParser('json', { limit: '15mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '15mb' });

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
