import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

import { GOOGLE_STRATEGY } from '../constants/auth.constants';

/** Scope shared by both OAuth cookies — narrow enough to never ride along. */
const GOOGLE_COOKIE_PATH = '/api/v1/auth/google';
const STATE_COOKIE = 'sw_oauth_state';
/** Generous: the user may sit on Google's account chooser for a while. */
const STATE_TTL_MS = 15 * 60 * 1000;

interface OAuthRequest extends Request {
  /** The `state` value to send to Google, stashed for authenticate options. */
  oauthState?: string;
}

/**
 * Google OAuth entry and callback, with CSRF protection.
 *
 * The flow is protected by a nonce split across two channels: the browser keeps
 * the raw nonce in an HttpOnly cookie, and only its SHA-256 goes to Google as
 * the `state` parameter. On the way back, `sha256(cookie) === state` must hold.
 *
 * Hashing that direction (not the reverse) matters: `state` travels in URLs, so
 * it lands in proxy logs, browser history and Referer headers, while the cookie
 * never leaves the browser. Leaking the hash tells an attacker nothing.
 *
 * Without this, an attacker could start their own Google login, capture their
 * unconsumed callback URL, and get a victim to load it — silently logging the
 * victim into the ATTACKER's account, where everything they then upload or
 * create belongs to the attacker. `passport-oauth2`'s default state store is
 * `NullStore`, whose `verify` always returns true, so the check has to live
 * here.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard(GOOGLE_STRATEGY) {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.path.endsWith('/callback')) {
      if (!this.verifyState(request, response)) {
        // Answer here rather than throwing: the browser is mid-navigation, and
        // a JSON error body is a dead end for the user. The CMS callback page
        // sees no `code` and routes to /login with the standard error toast.
        // `AllExceptionsFilter` skips an already-sent response.
        this.redirectToFrontend(response);
        return false;
      }
      return (await super.canActivate(context)) as boolean;
    }

    this.startState(request, response);
    this.bridgeAcquisition(request, response);
    return (await super.canActivate(context)) as boolean;
  }

  /**
   * Passport puts a string `state` into the authorize URL verbatim (see
   * `passport-oauth2`'s `authenticate`), which is exactly what we want.
   */
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    return request.oauthState ? { state: request.oauthState } : {};
  }

  private startState(request: OAuthRequest, response: Response): void {
    const nonce = randomBytes(32).toString('hex');
    response.cookie(STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.secure,
      maxAge: STATE_TTL_MS,
      path: GOOGLE_COOKIE_PATH,
    });
    request.oauthState = sha256(nonce);
  }

  private verifyState(request: OAuthRequest, response: Response): boolean {
    const cookies = request.cookies as Record<string, string> | undefined;
    const nonce = cookies?.[STATE_COOKIE];
    const state = request.query.state;

    // One-shot: clear before deciding, so a failed attempt cannot be replayed
    // against the same cookie.
    response.clearCookie(STATE_COOKIE, { path: GOOGLE_COOKIE_PATH });

    if (typeof nonce !== 'string' || typeof state !== 'string') {
      this.logger.warn(
        'Google OAuth callback rejected: missing state cookie or parameter',
      );
      return false;
    }

    const expected = Buffer.from(sha256(nonce));
    const actual = Buffer.from(state);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      this.logger.warn('Google OAuth callback rejected: state mismatch');
      return false;
    }

    return true;
  }

  private redirectToFrontend(response: Response): void {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    response.redirect(new URL('/auth/google/callback', frontendUrl).toString());
  }

  /**
   * A short-lived, HTTP-only bridge keeps anonymous attribution through the
   * cross-origin Google round trip. It has no authentication significance.
   */
  private bridgeAcquisition(request: Request, response: Response): void {
    const acquisition = request.query.acquisition;
    if (typeof acquisition === 'string' && acquisition.length <= 3500) {
      response.cookie('sw_acquisition', acquisition, {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.secure,
        maxAge: 10 * 60 * 1000,
        path: GOOGLE_COOKIE_PATH,
      });
    }
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
