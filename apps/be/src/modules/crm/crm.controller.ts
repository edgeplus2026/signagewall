import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { CrmService } from './crm.service';
import { CreateCrmLeadDto } from './dto/create-crm-lead.dto';
import { ListCrmLeadsQueryDto } from './dto/list-crm-leads-query.dto';
import { UpdateCrmLeadDto } from './dto/update-crm-lead.dto';

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Public()
  @Post('leads')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateCrmLeadDto) {
    if (!dto.website) await this.crm.createLead(dto);
    return { received: true };
  }

  @Get('admin/leads/overview')
  @UseGuards(SuperAdminGuard)
  overview() {
    return this.crm.overview();
  }

  @Get('admin/leads')
  @UseGuards(SuperAdminGuard)
  list(@Query() query: ListCrmLeadsQueryDto) {
    return this.crm.list(query);
  }

  @Get('admin/leads/:id')
  @UseGuards(SuperAdminGuard)
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.crm.getById(id);
  }

  @Patch('admin/leads/:id')
  @UseGuards(SuperAdminGuard)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCrmLeadDto,
  ) {
    return this.crm.update(id, user.id, dto);
  }
}
