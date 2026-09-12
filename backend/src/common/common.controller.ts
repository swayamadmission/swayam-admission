import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

export interface CategoryMasterItem {
  code: string;
  label: string;
  description: string;
  isReservation: boolean;
  requiresCertificate: boolean;
}

export const CANONICAL_CATEGORIES: CategoryMasterItem[] = [
  {
    code: 'GENERAL',
    label: 'General / Open Merit (UR)',
    description: 'Unreserved general merit category for admission and counseling.',
    isReservation: false,
    requiresCertificate: false,
  },
  {
    code: 'OBC',
    label: 'Other Backward Class (OBC - Non Creamy Layer)',
    description: 'Central or State recognized OBC category with valid NCL certificate.',
    isReservation: true,
    requiresCertificate: true,
  },
  {
    code: 'SC',
    label: 'Scheduled Caste (SC)',
    description: 'Constitutional reservation category with authorized caste certificate.',
    isReservation: true,
    requiresCertificate: true,
  },
  {
    code: 'ST',
    label: 'Scheduled Tribe (ST)',
    description: 'Constitutional reservation category with authorized tribe certificate.',
    isReservation: true,
    requiresCertificate: true,
  },
  {
    code: 'EWS',
    label: 'Economically Weaker Section (EWS)',
    description: 'General category candidates meeting family income/asset criteria with valid EWS certificate.',
    isReservation: true,
    requiresCertificate: true,
  },
];

@ApiTags('Common Master Data')
@Controller('common')
export class CommonController {
  @Get('categories')
  @ApiOperation({ summary: 'Get canonical student categories for admission & profile' })
  getCategories(): CategoryMasterItem[] {
    return CANONICAL_CATEGORIES;
  }
}
