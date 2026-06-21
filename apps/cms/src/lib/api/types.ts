import type { components, operations, paths } from './schema'

export type { components, operations, paths }

export type ApiSchema = components['schemas']

/** Unwrap `{ success: true, data }` from a 200 JSON response body. */
export type ApiSuccessData<T> = T extends { success: true; data: infer Data }
  ? Data
  : never

export type ApiOperationResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]['responses'] = 200,
> = operations[Operation]['responses'][Status] extends {
  content: { 'application/json': infer Body }
}
  ? Body
  : never

export type ApiOperationData<Operation extends keyof operations> = ApiSuccessData<
  ApiOperationResponse<Operation>
>

export type ApiUser = ApiSchema['UserResponseSchema']
export type ApiAuthTokens = ApiSchema['AuthTokensSchema']
export type ApiAuthResponse = ApiSchema['AuthResponseSchema']
export type ApiOrganization = ApiSchema['OrganizationResponseSchema']
export type ApiMember = ApiSchema['MemberResponseSchema']
export type ApiInvitationPreview = ApiSchema['InvitationPreviewSchema']
export type ApiAccountSettings = ApiSchema['AccountSettingsSchema']
export type ApiAdminUserListItem = ApiSchema['AdminUserListItemSchema']
export type ApiAdminUserDetail = ApiSchema['AdminUserDetailSchema']
export type ApiPaginatedAdminUsers = ApiSchema['PaginatedAdminUsersSchema']
export type ApiErrorEnvelope = ApiSchema['ApiErrorEnvelopeSchema']

export type ApiLoginRequest = ApiSchema['LoginDto']
export type ApiRegisterRequest = ApiSchema['RegisterDto']

/** Example: `ApiOperationData<'Authlogin'>` → auth response inside the envelope. */
export type ApiLoginResponse = ApiOperationData<'Authlogin'>
