import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { BusinessException } from '../../../common/exceptions/business.exception';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { UsersRepository } from '../../users/users.repository';
import { JWT_ACCESS_STRATEGY } from '../constants/auth.constants';

interface JwtPayload {
  sub: string;
  email: string;
  impersonatorId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  JWT_ACCESS_STRATEGY,
) {
  constructor(
    configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw BusinessException.unauthorized('You are not authorized.');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      ...(payload.impersonatorId
        ? { impersonatorId: payload.impersonatorId }
        : {}),
    };
  }
}
