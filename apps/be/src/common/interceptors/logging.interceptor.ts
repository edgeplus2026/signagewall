import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { getRequestId } from '../middleware/request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const startedAt = Date.now();

    // One line per request, tagged with the request id (also echoed in the
    // X-Request-Id header and any error body) and the acting user, so an
    // incident report can be traced to its exact log lines.
    const line = (status: number) => {
      const user = (request as { user?: { id?: string } }).user;
      return `${method} ${url} ${status} ${Date.now() - startedAt}ms rid=${getRequestId(response)} uid=${user?.id ?? '-'}`;
    };

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(line(response.statusCode)),
        // 5xx detail (stack) is logged by AllExceptionsFilter; this keeps the
        // access-log line itself complete for failed requests too.
        error: (error: unknown) =>
          this.logger.warn(
            line(error instanceof HttpException ? error.getStatus() : 500),
          ),
      }),
    );
  }
}
