import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { MarketingController } from './marketing.controller.js';
import { MarketingService } from './marketing.service.js';
import { AutomationService } from './automation.service.js';
import { AutomationController } from './automation.controller.js';
import { EmailTrackingController } from './email-tracking.controller.js';
import { EmailTrackingService } from './email-tracking.service.js';
@Module({ imports: [PrismaModule], controllers: [MarketingController, AutomationController, EmailTrackingController], providers: [MarketingService, AutomationService, EmailTrackingService], exports: [AutomationService, EmailTrackingService] }) export class MarketingModule { }
