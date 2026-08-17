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
  const candidate =
    typeof inbound === 'string' && INBOUND_ID_PATTERN.test(inbound)
      ? inbound
      : undefined;

  // Adopt an inbound id only when the request actually came through our proxy.
  // `trust proxy` is what makes `X-Forwarded-For` meaningful, and Express only
  // populates `req.ips` when it is set AND the header is present — so a
  // non-empty `req.ips` is the signal that a proxy, not an arbitrary caller,
  // is upstream. Without this any client could pin its own id and deliberately
  // collide with another tenant's traces.
  const viaTrustedProxy = req.ips.length > 0;

  const requestId = candidate && viaTrustedProxy ? candidate : randomUUID();

  // Keep a caller-supplied id we chose not to trust: still useful for
  // correlating with a customer's own logs, but never confusable with ours.
  if (candidate && !viaTrustedProxy) {
    res.locals.clientRequestId = candidate;
  }

  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function getRequestId(res: Response): string {
  const { requestId } = res.locals as { requestId?: unknown };
  return typeof requestId === 'string' ? requestId : '-';
}

/** A client-supplied `X-Request-Id` that was NOT adopted, for log correlation. */
export function getClientRequestId(res: Response): string | undefined {
  const { clientRequestId } = res.locals as { clientRequestId?: unknown };
  return typeof clientRequestId === 'string' ? clientRequestId : undefined;
}
