import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeographyService } from './geography.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Geography')
@Controller('geography')
export class GeographyPublicController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('states')
  @ApiOperation({ summary: 'Get all active states for public forms' })
  async getStates() {
    return await this.geographyService.getPublicStates();
  }

  @Get('states/detail/:slugOrId')
  @ApiOperation({
    summary: 'Get public state details by ID or slug with counts',
  })
  async getStateBySlugOrId(@Param('slugOrId') slugOrId: string) {
    return await this.geographyService.getPublicStateBySlugOrId(slugOrId);
  }

  @Get('states/:slugOrId/updates')
  @ApiOperation({
    summary: 'Get public published updates for a state by slug or ID',
  })
  async getStateUpdates(@Param('slugOrId') slugOrId: string) {
    return await this.geographyService.getPublicStateUpdates(slugOrId);
  }

  @Get('states/:stateId/districts')
  @ApiOperation({
    summary: 'Get all active districts under a state for dependent dropdown',
  })
  async getDistricts(@Param('stateId') stateId: string) {
    return await this.geographyService.getPublicDistricts(stateId);
  }

  @Get('districts')
  @ApiOperation({
    summary: 'Get all active districts under a state via query param',
  })
  async getDistrictsByQuery(@Query('stateId') stateId: string) {
    if (!stateId) return [];
    return await this.geographyService.getPublicDistricts(stateId);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate if a district belongs to a state' })
  async validate(
    @Query('stateId') stateId: string,
    @Query('districtId') districtId: string,
  ) {
    return await this.geographyService.validateStateDistrict(
      stateId,
      districtId,
    );
  }

  @Get('validate-pincode')
  @ApiOperation({ summary: 'Validate if a PIN code belongs to a state and district' })
  async validatePincode(
    @Query('stateId') stateId: string,
    @Query('districtId') districtId: string,
    @Query('pincode') pincode: string,
  ) {
    return await this.geographyService.validatePincode(
      stateId,
      districtId,
      pincode,
    );
  }
}
