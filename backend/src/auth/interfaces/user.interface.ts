import { Role } from '@prisma/client';

export class IUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  isApproved: boolean;
}
