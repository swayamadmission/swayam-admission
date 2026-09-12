import { PartialType } from '@nestjs/swagger';
import { CreateStudyMaterialDto } from './create-study-material.dto';

export class UpdateStudyMaterialDto extends PartialType(
  CreateStudyMaterialDto,
) {}
