import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

import { ErrorCodes } from '../constants/error-codes';
import { BusinessException } from '../exceptions/business.exception';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContext.current(host);

    const { status, code, message, details } = this.resolveException(
      exception,
      i18n,
    );

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolveException(
    exception: unknown,
    i18n: I18nContext | undefined,
  ): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof BusinessException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status: HttpStatus = exception.getStatus();

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return {
          status,
          code: ErrorCodes.TOO_MANY_REQUESTS,
          message: i18n?.t('common.tooManyRequests') ?? 'Too many requests.',
        };
      }

      // Multer rejects oversized uploads with a 413 before any handler runs;
      // surface a clean, localized message instead of the raw library string.
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        return {
          status,
          code: ErrorCodes.PAYLOAD_TOO_LARGE,
          message:
            i18n?.t('common.payloadTooLarge') ??
            'The uploaded file is too large.',
        };
      }

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        const code =
          typeof payload.code === 'string'
            ? payload.code
            : status === HttpStatus.UNAUTHORIZED
              ? ErrorCodes.UNAUTHORIZED
              : status === HttpStatus.FORBIDDEN
                ? ErrorCodes.FORBIDDEN
                : status === HttpStatus.NOT_FOUND
                  ? ErrorCodes.NOT_FOUND
                  : status === HttpStatus.CONFLICT
                    ? ErrorCodes.CONFLICT
                    : ErrorCodes.BAD_REQUEST;

        if (Array.isArray(payload.message)) {
          return {
            status,
            code: ErrorCodes.VALIDATION_ERROR,
            message: i18n?.t('validation.failed') ?? 'Validation failed',
            details: payload.message,
          };
        }

        const message =
          typeof payload.message === 'string'
            ? payload.message
            : exception.message;

        return {
          status,
          code,
          message,
          details: payload.details,
        };
      }

      return {
        status,
        code: ErrorCodes.BAD_REQUEST,
        message: exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL_ERROR,
      message: i18n?.t('common.internalError') ?? 'Internal server error',
    };
  }
}
