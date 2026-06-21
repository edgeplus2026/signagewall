import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { GOOGLE_STRATEGY } from '../constants/auth.constants';

@Injectable()
export class GoogleAuthGuard extends AuthGuard(GOOGLE_STRATEGY) {}
