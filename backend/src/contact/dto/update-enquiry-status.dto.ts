import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateEnquiryStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['NEW', 'IN_REVIEW', 'IN_PROGRESS', 'ASSIGNED', 'RESOLVED', 'CLOSED'], {
    message: 'Status must be NEW, IN_REVIEW, IN_PROGRESS, ASSIGNED, RESOLVED, or CLOSED',
  })
  status: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;

  @IsString()
  @IsOptional()
  assignedDepartment?: string;

  @IsString()
  @IsOptional()
  assignedStaffId?: string;

  @IsString()
  @IsOptional()
  assignedStaffName?: string;
}
