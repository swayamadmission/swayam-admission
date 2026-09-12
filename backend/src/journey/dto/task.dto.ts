export class JourneyTaskDto {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'COMPLETED';
  dueDate?: string;
  actionUrl?: string;
}
