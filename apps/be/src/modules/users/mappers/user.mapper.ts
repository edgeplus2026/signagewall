import { AuthProvider, UserDocument, UserRole } from '../schemas/user.schema';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  provider: AuthProvider;
  hasPassword: boolean;
  isSuperAdmin: boolean;
}

export const toUserResponse = (
  user: UserDocument,
  hasPassword: boolean,
): UserResponseDto => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  phone: user.phone,
  company: user.company,
  provider: user.provider,
  hasPassword,
  isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
});
