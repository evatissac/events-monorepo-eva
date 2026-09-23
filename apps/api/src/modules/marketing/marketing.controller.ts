import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MarketingService } from './marketing.service.js';

@Controller('organizations/:organizationId/marketing')
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  @Get('contacts')
  contacts(
    @Param('organizationId') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.contacts(id, Number(page) || 1, Number(limit) || 20, search);
  }

  @Post('contacts')
  contact(@Param('organizationId') id: string, @Body() data: any) {
    return this.service.createContact(id, data);
  }

  @Delete('contacts/:id')
  removeContact(@Param('organizationId') o: string, @Param('id') id: string) {
    return this.service.removeContact(o, id);
  }

  @Get('segments')
  segments(@Param('organizationId') id: string) {
    return this.service.segments(id);
  }

  @Post('segments')
  segment(@Param('organizationId') id: string, @Body() data: any) {
    return this.service.createSegment(id, data);
  }

  @Post('segments/from-event')
  createSegmentFromEvent(@Param('organizationId') id: string, @Body() data: any) {
    return this.service.createSegmentFromEvent(id, data);
  }

  @Delete('segments/:id')
  removeSegment(@Param('organizationId') o: string, @Param('id') id: string) {
    return this.service.removeSegment(o, id);
  }

  @Get('campaigns')
  campaigns(@Param('organizationId') id: string) {
    return this.service.campaigns(id);
  }

  @Post('campaigns')
  campaign(@Param('organizationId') id: string, @Body() data: any) {
    return this.service.createCampaign(id, data);
  }

  @Get('campaigns/:id')
  getCampaign(@Param('organizationId') o: string, @Param('id') id: string) {
    return this.service.getCampaign(o, id);
  }

  @Patch('campaigns/:id')
  updateCampaign(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.updateCampaign(o, id, data);
  }

  @Delete('campaigns/:id')
  removeCampaign(@Param('organizationId') o: string, @Param('id') id: string) {
    return this.service.removeCampaign(o, id);
  }
}
