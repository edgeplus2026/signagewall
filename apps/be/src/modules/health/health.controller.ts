import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import {
  ApiCommonErrorResponses,
  ApiSuccessResponse,
  HealthResponseSchema,
} from '../../common/swagger';

@ApiTags('health')
@ApiCommonErrorResponses()
@Controller('health')
export class HealthController {
  @Public()
  @Version(VERSION_NEUTRAL)
  @Get()
  @ApiSuccessResponse(HealthResponseSchema)
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
