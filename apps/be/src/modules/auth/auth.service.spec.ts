import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AuthService } from './auth.service';

/**
 * The two auth mechanisms this branch added, neither of which had a spec: the
 * per-account login lockout and the single-use Google exchange code. Both are
 * places where a regression is silent and expensive — a broken lockout is
 * invisible until someone is credential-stuffed, and a broken exchange code
 * either locks everyone out of Google login or makes it replayable.
 */

const PASSWORD = 'correct-horse-battery';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface UserOverrides {
  failedLoginAttempts?: number;
  loginLockedUntil?: Date;
  isActive?: boolean;
  password?: string;
}

async function build(overrides: UserOverrides = {}) {
  const userId = new Types.ObjectId();
  const user = {
    _id: userId,
    email: 'operator@example.com',
    name: 'Operator',
    password: overrides.password ?? (await bcrypt.hash(PASSWORD, 4)),
    isActive: overrides.isActive ?? true,
    isEmailVerified: true,
    ...(overrides.failedLoginAttempts !== undefined
      ? { failedLoginAttempts: overrides.failedLoginAttempts }
      : {}),
    ...(overrides.loginLockedUntil
      ? { loginLockedUntil: overrides.loginLockedUntil }
      : {}),
  };

  const usersRepository = {
    findByEmail: jest.fn().mockResolvedValue(user),
    recordFailedLogin: jest.fn().mockResolvedValue({ locked: false }),
    clearLoginLock: jest.fn().mockResolvedValue(undefined),
    updateById: jest.fn().mockResolvedValue(user),
    claimGoogleLoginCode: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(user),
    updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
  };

  const authTokensService = {
    generateTokens: jest.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    }),
    hashRefreshToken: jest.fn().mockResolvedValue('refresh-hash'),
  };

  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'auth.maxFailedLoginAttempts') return MAX_ATTEMPTS;
      if (key === 'auth.loginLockoutMinutes') return LOCKOUT_MINUTES;
      return fallback;
    }),
    getOrThrow: jest.fn(() => 'https://cms.example.com'),
  };

  const service = new AuthService(
    usersRepository as never,
    authTokensService as never,
    configService as never,
    { send: jest.fn(), isEnabled: () => false } as never,
    {} as never,
    { run: async (fn: () => unknown) => fn() } as never,
    { hasAccepted: jest.fn().mockResolvedValue(true) } as never,
    {} as never,
    { t: (key: string) => key } as never,
    { record: jest.fn().mockResolvedValue(undefined) } as never,
  );

  return { service, usersRepository, user, userId };
}

describe('AuthService — per-account login lockout', () => {
  it('counts a failed attempt against the account', async () => {
    const { service, usersRepository, userId } = await build();

    await expect(
      service.login({ email: 'operator@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(BusinessException);

    expect(usersRepository.recordFailedLogin).toHaveBeenCalledWith(
      userId.toString(),
      MAX_ATTEMPTS,
      LOCKOUT_MINUTES * 60 * 1000,
    );
  });

  /**
   * The counter must be driven by the repository's atomic `$inc`, never by a
   * read-then-write in the service — concurrent attempts would each read the
   * same count and the lock would never trip.
   */
  it('refuses a locked account even when the password is correct', async () => {
    const { service, usersRepository } = await build({
      loginLockedUntil: new Date(Date.now() + 60_000),
    });

    // The CORRECT password still fails, which is only possible if the lock is
    // checked ahead of password verification — the ordering that keeps a
    // locked account from costing a bcrypt comparison per attempt.
    await expect(
      service.login({ email: 'operator@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({ message: 'auth.accountTemporarilyLocked' });

    // And a locked account must not have its lock extended by further tries,
    // or an attacker could keep the owner locked out indefinitely.
    expect(usersRepository.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('lets the correct password through once the lock has expired', async () => {
    const { service } = await build({
      loginLockedUntil: new Date(Date.now() - 60_000),
    });

    await expect(
      service.login({ email: 'operator@example.com', password: PASSWORD }),
    ).resolves.toMatchObject({ tokens: { accessToken: 'access' } });
  });

  it('clears the counter after a successful login', async () => {
    const { service, usersRepository, userId } = await build({
      failedLoginAttempts: 3,
    });

    await service.login({ email: 'operator@example.com', password: PASSWORD });

    expect(usersRepository.clearLoginLock).toHaveBeenCalledWith(
      userId.toString(),
    );
  });

  it('does not clear the lock on a wrong password', async () => {
    const { service, usersRepository } = await build({
      failedLoginAttempts: 2,
    });

    await expect(
      service.login({ email: 'operator@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(BusinessException);

    expect(usersRepository.clearLoginLock).not.toHaveBeenCalled();
  });

  /**
   * A locked account and an unknown address must be indistinguishable in the
   * *unauthenticated* case, or the lockout becomes an account-enumeration
   * oracle. (A locked account the caller CAN name still gets the distinct
   * message — that is the point of telling the real owner.)
   */
  it('gives an unknown email the generic invalid-credentials error', async () => {
    const { service, usersRepository } = await build();
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({ message: 'auth.invalidCredentials' });
  });
});

describe('AuthService — single-use Google exchange code', () => {
  it('rejects a code the repository refuses to claim', async () => {
    const { service, usersRepository } = await build();
    usersRepository.claimGoogleLoginCode.mockResolvedValue(null);

    await expect(
      service.exchangeGoogleLoginCode('spent'),
    ).rejects.toMatchObject({ message: 'auth.googleAuthFailed' });
  });

  it('hashes the code before lookup — the raw code is never a stored value', async () => {
    const { service, usersRepository, user } = await build();
    usersRepository.claimGoogleLoginCode.mockResolvedValue(user);

    await service.exchangeGoogleLoginCode('raw-code-value');

    const [lookup] = usersRepository.claimGoogleLoginCode.mock.calls[0] as [
      string,
    ];
    expect(lookup).not.toBe('raw-code-value');
    expect(lookup).toMatch(/^[a-f0-9]{64}$/);
  });

  it('issues a token pair when the claim succeeds', async () => {
    const { service, usersRepository, user } = await build();
    usersRepository.claimGoogleLoginCode.mockResolvedValue(user);

    await expect(
      service.exchangeGoogleLoginCode('valid'),
    ).resolves.toMatchObject({ tokens: { accessToken: 'access' } });
  });

  /**
   * Single-use is enforced by the repository's atomic match-and-`$unset`, so
   * the second redemption of the same code sees no match. This asserts the
   * service surfaces that as a refusal rather than falling through.
   */
  it('refuses the second redemption of the same code', async () => {
    const { service, usersRepository, user } = await build();
    usersRepository.claimGoogleLoginCode
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    await expect(
      service.exchangeGoogleLoginCode('once'),
    ).resolves.toBeDefined();
    await expect(service.exchangeGoogleLoginCode('once')).rejects.toMatchObject(
      {
        message: 'auth.googleAuthFailed',
      },
    );
  });
});
