import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode, ErrorCodes } from '../constants/error-codes';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super(message, status);
  }

  static notFound(message: string, details?: unknown): BusinessException {
    return new BusinessException(
      ErrorCodes.NOT_FOUND,
      message,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  static conflict(message: string, details?: unknown): BusinessException {
    return new BusinessException(
      ErrorCodes.CONFLICT,
      message,
      HttpStatus.CONFLICT,
      details,
    );
  }

  static unauthorized(message: string, details?: unknown): BusinessException {
    return new BusinessException(
      ErrorCodes.UNAUTHORIZED,
      message,
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }

  static forbidden(message: string, details?: unknown): BusinessException {
    return new BusinessException(
      ErrorCodes.FORBIDDEN,
      message,
      HttpStatus.FORBIDDEN,
      details,
    );
  }

  static badRequest(message: string, details?: unknown): BusinessException {
    return new BusinessException(
      ErrorCodes.BAD_REQUEST,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  static tooManyRequests(
    message: string,
    details?: unknown,
  ): BusinessException {
    return new BusinessException(
      ErrorCodes.TOO_MANY_REQUESTS,
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      details,
    );
  }
}
