import { PartialType } from '@nestjs/mapped-types';
import { CreateContactEntryDto } from './create-contact-entry.dto';

export class UpdateContactEntryDto extends PartialType(CreateContactEntryDto) {}
