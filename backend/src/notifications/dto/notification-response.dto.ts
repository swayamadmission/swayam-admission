import { Notification } from '@prisma/client';

export class NotificationResponseDto {
  success: boolean;
  data: any[];
  count: number;
}
