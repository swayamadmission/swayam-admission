import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentContactDto } from './create-department-contact.dto';

export class UpdateDepartmentContactDto extends PartialType(CreateDepartmentContactDto) {}
