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

import {
  getClientRequestId,
  getRequestId,
} from '../middleware/request-id.middleware';

/**
 * Query parameters that are credentials in their own right. Several live
 * routes carry them: the Google callback (`code`, `state`) and the device
 * recovery link (`recovery`). An access log is the wrong place for any of
 * them — it is retained far longer than the seconds they stay valid, and it
 * is routinely shipped to third-party log aggregators.
 */
const REDACTED_QUERY_PARAMS = new Set([
  'code',
  'state',
  'recovery',
  'token',
  'access_token',
  'refresh_token',
  'accessToken',
  'refreshToken',
]);

/** `/path?code=abc&x=1` -> `/path?code=[redacted]&x=1`. */
function redactUrl(url: string): string {
  const split = url.indexOf('?');
  if (split === -1) {
    return url;
  }

  const path = url.slice(0, split);
  const params = new URLSearchParams(url.slice(split + 1));
  let touched = false;
  for (const key of [...params.keys()]) {
    if (REDACTED_QUERY_PARAMS.has(key)) {
      params.set(key, '[redacted]');
      touched = true;
    }
  }

  return touched ? `${path}?${params.toString()}` : url;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method } = request;
    const url = redactUrl(request.url);
    const startedAt = Date.now();

    // One line per request, tagged with the request id (also echoed in the
    // X-Request-Id header and any error body) and the acting user, so an
    // incident report can be traced to its exact log lines.
    const line = (status: number) => {
      const user = (request as { user?: { id?: string } }).user;
      const clientRid = getClientRequestId(response);
      return (
        `${method} ${url} ${status} ${Date.now() - startedAt}ms` +
        ` rid=${getRequestId(response)} uid=${user?.id ?? '-'}` +
        (clientRid ? ` client-rid=${clientRid}` : '')
      );
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
