import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApiErrorEnvelopeSchema } from '../schemas/error.response';

const successEnvelopeSchema = (dataRef: Record<string, unknown>) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    data: dataRef,
  },
});

export const ApiSuccessResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options?: { isArray?: boolean; description?: string },
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options?.description,
      schema: successEnvelopeSchema(
        options?.isArray
          ? { type: 'array', items: { $ref: getSchemaPath(model) } }
          : { $ref: getSchemaPath(model) },
      ),
    }),
  );

export const ApiSuccessNullResponse = (description?: string) =>
  ApiOkResponse({
    description,
    schema: successEnvelopeSchema({
      type: 'null',
      nullable: true,
      example: null,
    }),
  });

export const ApiCommonErrorResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation or business error',
      type: ApiErrorEnvelopeSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      type: ApiErrorEnvelopeSchema,
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden',
      type: ApiErrorEnvelopeSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'Not found',
      type: ApiErrorEnvelopeSchema,
    }),
    ApiResponse({
      status: 429,
      description: 'Rate limit exceeded',
      type: ApiErrorEnvelopeSchema,
    }),
  );
