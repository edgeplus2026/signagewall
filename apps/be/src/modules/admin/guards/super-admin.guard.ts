import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../../common/exceptions/business.exception';
import type { RequestUser } from '../../../common/interfaces/request-user.interface';
import { UserRole } from '../../users/schemas/user.schema';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class SuperAdminGuard implements CanActivate {
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

    if (user.impersonatorId) {
      throw BusinessException.forbidden(
        this.i18n.t('admin.impersonationBlocked'),
      );
    }

    const dbUser = await this.usersRepository.findById(user.id);

    if (!dbUser?.isActive || dbUser.role !== UserRole.SUPER_ADMIN) {
      throw BusinessException.forbidden(this.i18n.t('admin.forbidden'));
    }

    return true;
  }
}
