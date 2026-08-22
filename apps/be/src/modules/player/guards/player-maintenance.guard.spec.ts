import type { ExecutionContext } from '@nestjs/common';

import { UserRole } from '../../users/schemas/user.schema';
import { PlayerMaintenanceGuard } from './player-maintenance.guard';

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

describe('PlayerMaintenanceGuard', () => {
  const operatorId = '507f1f77bcf86cd799439011';
  const customerId = '507f1f77bcf86cd799439012';

  const build = (
    byId: Record<string, { isActive: boolean; role: UserRole } | null>,
  ) => {
    const usersRepository = {
      findById: jest.fn((id: string) => Promise.resolve(byId[id] ?? null)),
    };
    const guard = new PlayerMaintenanceGuard(
      usersRepository as never,
      {
        t: (key: string) => key,
      } as never,
    );
    return { guard, usersRepository };
  };

  it('returns 401 without an authenticated user', async () => {
    const { guard } = build({});

    await expect(guard.canActivate(context())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('refuses an ordinary member of the organisation', async () => {
    // The gap this guard closes: membership alone used to be enough, so anyone in
    // the customer's account could restart or update their screens while the CMS
    // offered the buttons to nobody but us.
    const { guard } = build({
      [customerId]: { isActive: true, role: UserRole.USER },
    });

    await expect(
      guard.canActivate(
        context({ id: customerId, email: 'staff@shop.com', name: 'Staff' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('allows a super-admin signed in as themselves', async () => {
    const { guard } = build({
      [operatorId]: { isActive: true, role: UserRole.SUPER_ADMIN },
    });

    await expect(
      guard.canActivate(
        context({ id: operatorId, email: 'ops@signagewall.com', name: 'Ops' }),
      ),
    ).resolves.toBe(true);
  });

  it('allows a super-admin working inside an impersonated session', async () => {
    // The whole reason this is not SuperAdminGuard, which refuses outright on any
    // impersonated request. While impersonating, the person holding the remote is
    // still us, and the CMS shows the buttons for exactly that reason — a guard
    // that disagreed would offer the control and then refuse the click.
    const { guard, usersRepository } = build({
      [customerId]: { isActive: true, role: UserRole.USER },
      [operatorId]: { isActive: true, role: UserRole.SUPER_ADMIN },
    });

    await expect(
      guard.canActivate(
        context({
          id: customerId,
          email: 'staff@shop.com',
          name: 'Staff',
          impersonatorId: operatorId,
        }),
      ),
    ).resolves.toBe(true);
    // It judged the operator, not the session it is standing in.
    expect(usersRepository.findById).toHaveBeenCalledWith(operatorId);
  });

  it('refuses when the impersonator is not a super-admin', async () => {
    const { guard } = build({
      [customerId]: { isActive: true, role: UserRole.USER },
      [operatorId]: { isActive: true, role: UserRole.USER },
    });

    await expect(
      guard.canActivate(
        context({
          id: customerId,
          email: 'staff@shop.com',
          name: 'Staff',
          impersonatorId: operatorId,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('refuses a super-admin whose account has been deactivated', async () => {
    // Read from the database rather than trusted from the token, so revoking an
    // operator takes effect on the next request rather than at their next login.
    const { guard } = build({
      [operatorId]: { isActive: false, role: UserRole.SUPER_ADMIN },
    });

    await expect(
      guard.canActivate(
        context({ id: operatorId, email: 'ops@signagewall.com', name: 'Ops' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
