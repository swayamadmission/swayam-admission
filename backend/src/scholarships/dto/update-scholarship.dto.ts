import { PartialType } from '@nestjs/swagger';
import { CreateScholarshipDto } from './create-scholarship.dto';

export class UpdateScholarshipDto extends PartialType(CreateScholarshipDto) {}
