import './load-env';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { RedisIoAdapter } from './common/redis/redis-io.adapter';
import { setupSwagger } from './common/swagger';

/** Whole-request budget, sized by the largest upload the API accepts. */
const UPLOAD_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;

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

  // Behind Railway's proxy req.ip is the proxy address unless Express is told
  // how many hops to trust; per-IP throttling is meaningless without this.
  const trustProxyHops = configService.getOrThrow<number>('trustProxyHops');
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  const apiPrefix = configService.getOrThrow<string>('apiPrefix');
  const frontendUrl = configService.getOrThrow<string>('frontendUrl');
  const playerUrl = configService.getOrThrow<string>('playerUrl');
  const marketingUrl = configService.getOrThrow<string>('marketingUrl');
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

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: swaggerEnabled ? false : undefined,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // CMS, player and public marketing origins call this API. The analytics route
  // is public/rate-limited and stores only allowlisted, non-PII fields.
  app.enableCors({
    origin: [frontendUrl, playerUrl, marketingUrl],
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

  // The realtime player channel is room-based, and rooms are process-local
  // unless the adapter says otherwise. Wire Redis in when it is configured, so
  // several API instances behave as one; fall back silently when it is not,
  // which is the correct single-instance/laptop setup.
  const logger = new Logger('Bootstrap');
  const redisAdapter = new RedisIoAdapter(app, configService);
  if (redisAdapter.connect()) {
    app.useWebSocketAdapter(redisAdapter);
    logger.log('Socket.IO running on the Redis adapter (multi-instance ready)');
  } else {
    logger.warn(
      'No Redis configured — Socket.IO is using the in-memory adapter. ' +
        'This deployment MUST run a single API instance, or content pushes, ' +
        'presence and revokes will only reach the instance that handled them.',
    );
  }

  // SIGTERM must run the onModuleDestroy hooks: the scheduler releases its
  // leases there, so a rolling deploy hands the periodic jobs over in seconds
  // instead of leaving nobody running them for a lease period.
  app.enableShutdownHooks();

  await app.listen(port);

  // Node 18 defaults `requestTimeout` to 5 minutes, which is a limit on the
  // WHOLE request — body included. A 200 MB video (the media upload ceiling)
  // therefore needed ~5.6 Mbit/s of sustained upload just to beat the clock,
  // and anything slower was killed mid-body and surfaced to the customer as a
  // failed upload. 20 minutes puts the floor at roughly 1.4 Mbit/s instead.
  //
  // `headersTimeout` is deliberately left alone: the headers phase is where
  // slow-request abuse actually lives, and it still has to finish in 60s.
  app.getHttpServer().requestTimeout = UPLOAD_REQUEST_TIMEOUT_MS;
}

void bootstrap().catch((error: unknown) => {
  // Without this the process dies on an unhandled rejection, which prints a
  // bare stack and no indication of which part of the boot failed.
  new Logger('Bootstrap').error(
    `Failed to start: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
