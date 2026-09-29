import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import { MailModule } from '../mail/mail.module.js';
import { EmailSettingsController } from './email-settings.controller.js';
import { EmailSettingsService } from './email-settings.service.js';
import { ResendWebhooksController } from './resend-webhooks.controller.js';
import { ResendWebhooksService } from './resend-webhooks.service.js';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [EmailSettingsController, ResendWebhooksController],
  providers: [EmailSettingsService, ResendWebhooksService, PrismaService],
  exports: [EmailSettingsService],
})
export class EmailSettingsModule {}
