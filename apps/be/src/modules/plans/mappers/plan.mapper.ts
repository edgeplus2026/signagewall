import { PaginatedResult } from '../../../common/dto/paginated-result';
import { UserPlan } from '../../users/schemas/user.schema';
import { UpgradeRequestDocument } from '../schemas/upgrade-request.schema';

/** What the CMS needs to decide between "Upgrade plan" and "Request licences". */
export interface PlanEntitlementDto {
  plan: UserPlan;
  /** `null` means unlimited. */
  screenLimit: number | null;
  screensUsed: number;
  organizationLimit: number | null;
  organizationsUsed: number;
  canCreateScreen: boolean;
  canCreateOrganization: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  /** Covered by somebody else's paid organization — hide every plan prompt. */
  isSponsored: boolean;
  hasOpenUpgradeRequest: boolean;
}

export interface AdminUpgradeRequestDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planAtRequest: UserPlan;
  screenLimitAtRequest: number;
  requestedScreens: number;
  message?: string;
  phone?: string;
  company?: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export type PaginatedAdminUpgradeRequestsDto =
  PaginatedResult<AdminUpgradeRequestDto>;

export const toAdminUpgradeRequest = (
  request: UpgradeRequestDocument,
  user: { name: string; email: string } | null,
): AdminUpgradeRequestDto => ({
  id: request._id.toString(),
  userId: request.userId.toString(),
  // A request outlives nothing — the user row is erased with it — but a purge
  // racing the admin list would otherwise throw here.
  userName: user?.name ?? 'Deleted user',
  userEmail: user?.email ?? '—',
  planAtRequest: request.planAtRequest,
  screenLimitAtRequest: request.screenLimitAtRequest,
  requestedScreens: request.requestedScreens,
  ...(request.message ? { message: request.message } : {}),
  ...(request.phone ? { phone: request.phone } : {}),
  ...(request.company ? { company: request.company } : {}),
  status: request.status,
  createdAt: request.createdAt.toISOString(),
  resolvedAt: request.resolvedAt?.toISOString() ?? null,
});
