import { randomUUID } from 'crypto';

import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Accepted shape for a proxy-injected request id. Anything else (too long,
 * control characters, header-splitting attempts) is replaced, never echoed.
 */
const INBOUND_ID_PATTERN = /^[\w.:-]{8,128}$/;

/**
 * Tags every request with an id — reused from the proxy's `X-Request-Id` when
 * it supplies a sane one, minted otherwise — echoes it on the response, and
 * parks it on `res.locals` for the logging interceptor and exception filter.
 * One id ties together the access log line, the error log stack and the JSON
 * error body a customer quotes to support.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof inbound === 'string' && INBOUND_ID_PATTERN.test(inbound)
      ? inbound
      : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function getRequestId(res: Response): string {
  const { requestId } = res.locals as { requestId?: unknown };
  return typeof requestId === 'string' ? requestId : '-';
}
