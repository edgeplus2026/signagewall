import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { GOOGLE_STRATEGY } from '../constants/auth.constants';

@Injectable()
export class GoogleAuthGuard extends AuthGuard(GOOGLE_STRATEGY) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const acquisition = request.query.acquisition;

    // A short-lived, HTTP-only bridge keeps anonymous attribution through the
    // cross-origin Google round trip. It has no authentication significance.
    if (typeof acquisition === 'string' && acquisition.length <= 3500) {
      response.cookie('sw_acquisition', acquisition, {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.secure,
        maxAge: 10 * 60 * 1000,
        path: '/api/v1/auth/google',
      });
    }

    return (await super.canActivate(context)) as boolean;
  }
}
