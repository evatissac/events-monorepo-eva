import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ParticipantsService } from './participants.service.js';
class AddParticipantDto { @IsUUID() profileId!: string; @IsOptional() @IsUUID() roleId?: string; }
class ManualParticipantDto { @IsOptional() @IsUUID() editionId?: string; @IsString() @MinLength(1) firstName!: string; @IsString() @MinLength(1) lastName!: string; @IsEmail() email!: string; @IsOptional() @IsString() identityDocumentType?: string | null; @IsOptional() @IsString() identityDocumentNumber?: string | null; }
@Controller()
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}
  @Get('editions/:editionId/participants') list(@Param('editionId') editionId: string) { return this.participants.list(editionId); }
  @Post('editions/:editionId/participants') add(@Param('editionId') editionId: string, @Body() dto: AddParticipantDto) { return this.participants.add(editionId, dto.profileId, dto.roleId); }
  @Post('events/:eventId/manual-participants') addManual(@Param('eventId') eventId: string, @Body() dto: ManualParticipantDto) { return this.participants.addManual(eventId, dto); }
  @Get('participants/:id') get(@Param('id') id: string) { return this.participants.get(id); }
  @Patch('participants/:id') update(@Param('id') id: string, @Body() body: { checkedIn?: boolean }) { return this.participants.update(id, body); }
  @Patch('participants/:id/role') changeRole(@Param('id') id: string, @Body('roleId') roleId: string, @Req() request: any) { return this.participants.changeRole(id, roleId, request.user); }
  @Delete('participants/:id') remove(@Param('id') id: string, @Req() request: any) { return this.participants.remove(id, request.user); }
}
