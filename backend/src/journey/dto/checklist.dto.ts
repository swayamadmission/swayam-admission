export class ChecklistItemDto {
  category: string;
  title: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'NEEDS_ACTION';
  description?: string;
}
