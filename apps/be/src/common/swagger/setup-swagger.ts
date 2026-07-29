import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';
export const SWAGGER_JSON_PATH = 'docs-json';

export const createSwaggerDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('SignageWall API')
    .setDescription(
      'Digital signage CMS API. Success responses use `{ success: true, data }`. ' +
        'Errors use `{ success: false, error: { code, message, details? } }`.',
    )
    .setVersion('1')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      name: 'Accept-Language',
      description: 'API message language (`en` or `sr`)',
      required: false,
      schema: { type: 'string', enum: ['en', 'sr'], default: 'en' },
    })
    .addGlobalParameters({
      in: 'header',
      name: 'x-lang',
      description: 'Alternative language header (same as Accept-Language)',
      required: false,
      schema: { type: 'string', enum: ['en', 'sr'] },
    })
    .build();

  return SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: false,
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey}_${methodKey}`.replace(/Controller_/g, ''),
  });
};

export const setupSwagger = (app: INestApplication): void => {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.getOrThrow<string>('apiPrefix');
  const document = createSwaggerDocument(app);

  SwaggerModule.setup(`${apiPrefix}/${SWAGGER_PATH}`, app, document, {
    jsonDocumentUrl: `${apiPrefix}/${SWAGGER_JSON_PATH}`,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
};

export const getOpenApiJsonUrl = (port: number, apiPrefix: string): string =>
  `http://localhost:${port}/${apiPrefix}/${SWAGGER_JSON_PATH}`;
