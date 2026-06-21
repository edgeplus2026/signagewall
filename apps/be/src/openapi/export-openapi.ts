import '../load-env';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AppModule } from '../app.module';
import { createSwaggerDocument } from '../common/swagger';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const document = createSwaggerDocument(app);
  const outputPath = resolve(__dirname, '../../openapi.json');

  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  await app.close();

  console.log(`OpenAPI spec written to ${outputPath}`);
}

void exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
