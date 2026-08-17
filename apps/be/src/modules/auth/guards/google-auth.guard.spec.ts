import { ExecutionContext } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

import { GoogleAuthGuard } from './google-auth.guard';

const FRONTEND = 'https://cms.example.com';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

interface Setup {
  path?: string;
  cookies?: Record<string, string>;
  query?: Record<string, unknown>;
}

function build(setup: Setup = {}) {
  const request = {
    path: setup.path ?? '/api/v1/auth/google',
    cookies: setup.cookies ?? {},
    query: setup.query ?? {},
    secure: true,
  } as Record<string, unknown>;

  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  };

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'frontendUrl') return FRONTEND;
      throw new Error(`unexpected key ${key}`);
    }),
  };

  const guard = new GoogleAuthGuard(configService as never);
  // Passport's own work is out of scope here — every assertion below is about
  // whether the CSRF gate lets the request reach it at all.
  const passport = jest
    .spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
        canActivate: () => Promise<boolean>;
      },
      'canActivate',
    )
    .mockResolvedValue(true);

  return { guard, context, request, response, passport };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GoogleAuthGuard — OAuth CSRF state', () => {
  it('sets a nonce cookie and sends only its hash to Google', async () => {
    const { guard, context, request, response } = build();

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(response.cookie).toHaveBeenCalledWith(
      'sw_oauth_state',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    const nonce = response.cookie.mock.calls[0][1] as string;
    const options = guard.getAuthenticateOptions(context) as { state: string };

    expect(options.state).toBe(sha256(nonce));
    // The raw nonce must never travel in the URL — that is the whole point.
    expect(options.state).not.toBe(nonce);
    expect(request.oauthState).toBe(options.state);
  });

  it('admits a callback whose state matches the cookie', async () => {
    const nonce = randomBytes(32).toString('hex');
    const { guard, context, response, passport } = build({
      path: '/api/v1/auth/google/callback',
      cookies: { sw_oauth_state: nonce },
      query: { state: sha256(nonce), code: 'google-code' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(passport).toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledWith('sw_oauth_state', {
      path: '/api/v1/auth/google',
    });
  });

  /**
   * The attack this exists to stop: the attacker replays their own callback URL
   * at a victim who never started a login, so the victim holds no state cookie.
   */
  it('refuses a callback with no state cookie and never reaches Passport', async () => {
    const { guard, context, response, passport } = build({
      path: '/api/v1/auth/google/callback',
      query: { state: sha256('attacker-nonce'), code: 'attacker-code' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(passport).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      `${FRONTEND}/auth/google/callback`,
    );
  });

  it("refuses a callback whose state does not match the victim's cookie", async () => {
    const { guard, context, passport } = build({
      path: '/api/v1/auth/google/callback',
      cookies: { sw_oauth_state: randomBytes(32).toString('hex') },
      query: { state: sha256('attacker-nonce'), code: 'attacker-code' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(passport).not.toHaveBeenCalled();
  });

  it('refuses a callback with no state parameter at all', async () => {
    const { guard, context, passport } = build({
      path: '/api/v1/auth/google/callback',
      cookies: { sw_oauth_state: randomBytes(32).toString('hex') },
      query: { code: 'some-code' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(passport).not.toHaveBeenCalled();
  });

  it('clears the nonce before deciding, so a failed attempt cannot be replayed', async () => {
    const { guard, context, response } = build({
      path: '/api/v1/auth/google/callback',
      cookies: { sw_oauth_state: randomBytes(32).toString('hex') },
      query: { state: 'wrong' },
    });

    await guard.canActivate(context);

    expect(response.clearCookie).toHaveBeenCalledWith('sw_oauth_state', {
      path: '/api/v1/auth/google',
    });
  });

  it('still bridges the acquisition cookie on the start leg', async () => {
    const { guard, context, response } = build({
      query: { acquisition: 'utm_source=google' },
    });

    await guard.canActivate(context);

    expect(response.cookie).toHaveBeenCalledWith(
      'sw_acquisition',
      'utm_source=google',
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
