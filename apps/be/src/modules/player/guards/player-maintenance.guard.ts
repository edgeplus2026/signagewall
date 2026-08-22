import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../../common/exceptions/business.exception';
import type { RequestUser } from '../../../common/interfaces/request-user.interface';
import { UserRole } from '../../users/schemas/user.schema';
import { UsersRepository } from '../../users/users.repository';

/**
 * Guards the device actions that only somebody maintaining players should reach:
 * restart, install-update, diagnostics, the shell channel and the nightly reload.
 *
 * These lived behind `@RequireOrgRole()` alone, which asks only for membership — so
 * every one of them was callable by any non-viewer member of the organisation while
 * the CMS showed the buttons to nobody but us. Tenant scoping was never the gap
 * (`OrgMembershipGuard` plus `resolveOwnedDevice` still keep one customer out of
 * another's screens); the gap was that hiding a control is not the same as
 * withholding it, and the hook that hides them says so in as many words.
 *
 * Deliberately NOT [SuperAdminGuard]. That one refuses outright when a request
 * carries an `impersonatorId`, which is right for the admin console — an operator
 * must not reshape a customer's account from inside their session — but wrong here.
 * While impersonating, the person holding the remote is still us, and the CMS
 * mirrors that: `useIsSuperAdmin` ignores impersonation precisely so the restart
 * button stays in the one hand that should hold it. A guard that disagreed would
 * show the button and then refuse the click.
 *
 * So the question is about the ACTOR, not the session: whoever is really driving
 * this request must be an active super-admin, whether they are signed in as
 * themselves or standing in a customer's session. Re-read from the database rather
 * than trusted from the token, for the same reason [SuperAdminGuard] does it: a
 * revoked operator must lose the power immediately, not at their next login.
 */
@Injectable()
export class PlayerMaintenanceGuard implements CanActivate {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const actorId = user.impersonatorId ?? user.id;
    const actor = await this.usersRepository.findById(actorId);

    if (!actor?.isActive || actor.role !== UserRole.SUPER_ADMIN) {
      throw BusinessException.forbidden(this.i18n.t('admin.forbidden'));
    }

    return true;
  }
}
