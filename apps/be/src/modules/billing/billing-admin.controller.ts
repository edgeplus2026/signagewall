import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessResponse,
  BillingExceptionResponseSchema,
  BillingOverviewResponseSchema,
  ManualInvoiceResponseSchema,
  PaginatedManualInvoicesResponseSchema,
} from '../../common/swagger';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { BillingService } from './billing.service';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { ListManualInvoicesQueryDto } from './dto/list-manual-invoices-query.dto';
import { MarkManualInvoicePaidDto } from './dto/mark-manual-invoice-paid.dto';
import { UpdateManualInvoiceDto } from './dto/update-manual-invoice.dto';
import { VoidManualInvoiceDto } from './dto/void-manual-invoice.dto';

@ApiTags('admin-billing')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('admin/billing')
@UseGuards(SuperAdminGuard)
export class BillingAdminController {
  constructor(private readonly billingService: BillingService) {}

  @Get('overview')
  @ApiSuccessResponse(BillingOverviewResponseSchema)
  overview() {
    return this.billingService.getOverview();
  }

  @Get('exceptions')
  @ApiSuccessResponse(BillingExceptionResponseSchema, { isArray: true })
  exceptions() {
    return this.billingService.listExceptions();
  }

  @Get('invoices')
  @ApiSuccessResponse(PaginatedManualInvoicesResponseSchema)
  listInvoices(@Query() query: ListManualInvoicesQueryDto) {
    return this.billingService.listInvoices({
      page: query.page,
      limit: query.limit,
      ...(query.status ? { status: query.status } : {}),
    });
  }

  @Post('invoices')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  createInvoice(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateManualInvoiceDto,
  ) {
    return this.billingService.createInvoice(user.id, dto);
  }

  @Patch('invoices/:id')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  updateInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateManualInvoiceDto,
  ) {
    return this.billingService.updateInvoice(user.id, id, dto);
  }

  /** Confirms that the founder sent the external invoice manually. */
  @Post('invoices/:id/mark-sent')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  markSent(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.billingService.markSent(user.id, id);
  }

  @Post('invoices/:id/mark-paid')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  markPaid(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: MarkManualInvoicePaidDto,
  ) {
    return this.billingService.markPaid(user.id, id, dto);
  }

  @Post('invoices/:id/void')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  voidInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: VoidManualInvoiceDto,
  ) {
    return this.billingService.voidInvoice(user.id, id, dto);
  }

  /** Hides a terminal invoice while retaining its audit and payment history. */
  @Delete('invoices/:id')
  @ApiSuccessResponse(ManualInvoiceResponseSchema)
  archiveInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.billingService.archiveInvoice(user.id, id);
  }
}
