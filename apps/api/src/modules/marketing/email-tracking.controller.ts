import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/public.decorator.js';
import { EmailTrackingService } from './email-tracking.service.js';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

@Public()
@Controller('email-tracking')
export class EmailTrackingController {
  constructor(private readonly tracking: EmailTrackingService) {}

  @Get('open/:token')
  async open(@Param('token') token: string, @Req() request: Request, @Res() response: Response) {
    try { await this.tracking.recordOpen(token, { userAgent: request.headers['user-agent'] || null }); } catch { /* El píxel no debe revelar información al destinatario. */ }
    response.setHeader('Content-Type', 'image/gif');
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response.status(200).send(PIXEL);
  }

  @Get('click/:token')
  async click(@Param('token') token: string, @Query('url') url: string, @Req() request: Request, @Res() response: Response) {
    const destination = String(url || '');
    if (!/^https?:\/\//i.test(destination)) return response.status(400).send('Destino inválido');
    try { await this.tracking.recordClick(token, destination, { userAgent: request.headers['user-agent'] || null }); } catch { /* La redirección sigue funcionando aunque el tracking falle. */ }
    return response.redirect(302, destination);
  }

  @Get('unsubscribe/:token')
  async unsubscribe(@Param('token') token: string, @Req() request: Request, @Res() response: Response) {
    try { await this.tracking.unsubscribe(token, { userAgent: request.headers['user-agent'] || null }); } catch { return response.status(404).send('Enlace de baja no válido'); }
    return response.type('html').send('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Suscripción cancelada</title></head><body style="font-family:Arial,sans-serif;padding:48px;color:#1f2937"><h1>Suscripción cancelada</h1><p>No recibirás más comunicaciones de esta institución.</p></body></html>');
  }

  @Post('provider-events')
  async providerEvents(
    @Body() payload: Record<string, unknown>,
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ) {
    await this.tracking.verifyResendWebhook(request.rawBody, { id, timestamp, signature });
    return this.tracking.providerEvent(payload);
  }
}
