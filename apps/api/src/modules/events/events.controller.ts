import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { EventsService } from './events.service.js';

class CreateEventDto { @IsString() @MinLength(2) eventName!: string; @IsDateString() startDate!: string; @IsOptional() @IsString() organizationId?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() coverUrl?: string; @IsOptional() @IsString() logoUrl?: string; }

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}
  @Get() list(@Query('organizationId') organizationId?: string) { return this.events.list(organizationId); }
  @Get(':id/contacts') contacts(@Param('id') id: string) { return this.events.contacts(id); }
  @Get(':id/attendees/export') attendeeExport(@Param('id') id: string) { return this.events.attendeeExport(id); }
  @Get(':id/attendees') attendees(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) { return this.events.attendees(id, Number(page) || 1, Number(limit) || 20, search); }
  @Post(':id/contacts') addContact(@Param('id') id: string, @Body() body: { name: string; email?: string; phone?: string; role?: string }) { return this.events.addContact(id, body); }
  @Patch('contacts/:contactId') updateContact(@Param('contactId') id: string, @Body() body: { name?: string; email?: string; phone?: string; role?: string }) { return this.events.updateContact(id, body); }
  @Delete('contacts/:contactId') removeContact(@Param('contactId') id: string) { return this.events.removeContact(id); }
  @Get(':id/setup') setup(@Param('id') id: string) { return this.events.getSetup(id); }
  @Patch(':id/setup') updateSetup(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.events.updateSetup(id, body); }
  @Post(':id/setup/complete') completeSetup(@Param('id') id: string) { return this.events.completeSetup(id); }
  @Get(':id') get(@Param('id') id: string) { return this.events.get(id); }
  @Post() create(@Body() dto: CreateEventDto) { return this.events.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.events.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.events.remove(id); }
}
