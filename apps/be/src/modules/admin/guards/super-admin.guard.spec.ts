import type { ExecutionContext } from '@nestjs/common';

import { UserRole } from '../../users/schemas/user.schema';
import { SuperAdminGuard } from './super-admin.guard';

const context = (user?: {
  id: string;
  email: string;
  name: string;
  impersonatorId?: string;
}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as never;

describe('SuperAdminGuard', () => {
  const userId = '507f1f77bcf86cd799439011';

  const build = (dbUser: { isActive: boolean; role: UserRole } | null) => {
    const usersRepository = {
      findById: jest.fn().mockResolvedValue(dbUser),
    };
    const guard = new SuperAdminGuard(
      usersRepository as never,
      {
        t: (key: string) => key,
      } as never,
    );
    return { guard, usersRepository };
  };

  it('returns 401 without an authenticated user', async () => {
    const { guard } = build(null);

    await expect(guard.canActivate(context())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('returns 403 for a normal registered user', async () => {
    const { guard } = build({ isActive: true, role: UserRole.USER });

    await expect(
      guard.canActivate(
        context({ id: userId, email: 'user@example.com', name: 'User' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('returns 403 for an inactive super-admin', async () => {
    const { guard } = build({
      isActive: false,
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      guard.canActivate(
        context({ id: userId, email: 'admin@example.com', name: 'Admin' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('returns 403 before the database lookup for an impersonated session', async () => {
    const { guard, usersRepository } = build({
      isActive: true,
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      guard.canActivate(
        context({
          id: userId,
          email: 'customer@example.com',
          name: 'Customer',
          impersonatorId: '507f191e810c19729de860ea',
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(usersRepository.findById).not.toHaveBeenCalled();
  });

  it('allows only an active super-admin confirmed from the database', async () => {
    const { guard } = build({
      isActive: true,
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      guard.canActivate(
        context({ id: userId, email: 'admin@example.com', name: 'Admin' }),
      ),
    ).resolves.toBe(true);
  });
});
