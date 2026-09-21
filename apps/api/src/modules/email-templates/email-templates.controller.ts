import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { EmailTemplatesService } from './email-templates.service.js';

class CreateEmailTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsIn(['EMAIL', 'WHATSAPP', 'SMS'])
  channel?: string;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  starterId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

@Controller()
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get('email-templates/starters')
  getStarters() {
    return this.templates.getStarters();
  }

  @Get('organizations/:organizationId/email-templates')
  list(
    @Param('organizationId') organizationId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.templates.list(organizationId, search, category);
  }

  @Get('email-templates/:id')
  get(@Param('id') id: string) {
    return this.templates.get(id);
  }

  @Post('organizations/:organizationId/email-templates')
  create(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateEmailTemplateDto,
  ) {
    return this.templates.create(organizationId, data);
  }

  @Patch('email-templates/:id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.templates.update(id, data);
  }

  @Delete('email-templates/:id')
  remove(@Param('id') id: string) {
    return this.templates.remove(id);
  }

  @Post('email-templates/:id/duplicate')
  duplicate(@Param('id') id: string, @Body() data: any) {
    return this.templates.duplicate(id, data);
  }

  @Post('email-templates/:id/test')
  sendTest(@Param('id') id: string, @Body('email') email: string) {
    return this.templates.sendTest(id, email);
  }
}
