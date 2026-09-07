import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { MediaOrientation, MediaOwnerType, MediaPurpose } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { PrismaService } from '../../database/prisma.service.js';
import { R2StorageService } from './r2-storage.service.js';

const owners = new Set<MediaOwnerType>(['ORGANIZATION', 'EVENT', 'EDITION', 'PROFILE']);
const purposes = new Set<MediaPurpose>(['COVER', 'LOGO', 'GALLERY', 'DOCUMENT', 'OTHER']);
const orientations = new Set<MediaOrientation>(['LANDSCAPE', 'PORTRAIT', 'SQUARE', 'VIDEO', 'OTHER']);


@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService, private readonly storage: R2StorageService) {}

  private assertOwnerType(ownerType: string): asserts ownerType is MediaOwnerType {
    if (!owners.has(ownerType as MediaOwnerType)) throw new BadRequestException('Tipo de propietario multimedia inválido.');
  }

  private assertPurpose(purpose?: string): MediaPurpose {
    const value = (purpose ?? 'GALLERY') as MediaPurpose;
    if (!purposes.has(value)) throw new BadRequestException('Propósito multimedia inválido.');
    return value;
  }

  async assertAccess(organizationId: string | undefined, accountId: string, role: string) {
    if (!organizationId || ['SUPER_ADMIN', 'SAAS_ADMIN'].includes(role)) return;
    const member = await this.prisma.organizationMember.findFirst({ where: { organizationId, accountId } });
    if (!member) throw new ForbiddenException('No tienes acceso a esta organización.');
  }

  private async ownerOrganizationId(ownerType: MediaOwnerType, ownerId: string) {
    if (ownerType === 'ORGANIZATION') return ownerId;
    if (ownerType === 'EVENT') {
      const event = await this.prisma.mainEvent.findUnique({ where: { id: ownerId }, select: { organizationId: true } });
      if (!event) throw new NotFoundException('Evento no encontrado.');
      return event.organizationId ?? undefined;
    }
    if (ownerType === 'PROFILE') {
      const profile = await this.prisma.profile.findUnique({ where: { id: ownerId }, select: { organizationId: true } });
      if (!profile) throw new NotFoundException('Perfil no encontrado.');
      if (profile.organizationId) return profile.organizationId;
      const participant = await this.prisma.eventParticipant.findFirst({ where: { profileId: ownerId }, select: { edition: { select: { mainEvent: { select: { organizationId: true } } } } } });
      return participant?.edition.mainEvent.organizationId ?? undefined;
    }
    const edition = await this.prisma.edition.findUnique({ where: { id: ownerId }, select: { mainEvent: { select: { organizationId: true } } } });
    if (!edition) throw new NotFoundException('Edición no encontrada.');
    return edition.mainEvent.organizationId ?? undefined;
  }

  private orientation(file: Express.Multer.File): MediaOrientation {
    if (file.mimetype.startsWith('video/')) return 'VIDEO';
    const dimensions = /^(\d+)x(\d+)$/.exec((file as Express.Multer.File & { dimensions?: string }).dimensions ?? '');
    if (!dimensions) return 'OTHER';
    const [width, height] = dimensions.slice(1).map(Number);
    return width === height ? 'SQUARE' : width > height ? 'LANDSCAPE' : 'PORTRAIT';
  }

  async upload(file: Express.Multer.File | undefined, input: { ownerType: string; ownerId: string; purpose?: string; position?: string; isFeatured?: string; orientation?: string; organizationId?: string }, actor: { accountId: string; role: string }) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo.');
    this.assertOwnerType(input.ownerType);
    if (!input.ownerId) throw new BadRequestException('Debes indicar el recurso al que se asociará el archivo.');
    const purpose = this.assertPurpose(input.purpose);
    const ownerOrganizationId = await this.ownerOrganizationId(input.ownerType, input.ownerId);
    if (input.organizationId && input.organizationId !== ownerOrganizationId) throw new BadRequestException('La organización no coincide con el recurso multimedia.');
    await this.assertAccess(ownerOrganizationId, actor.accountId, actor.role);
    if (file.size > 25 * 1024 * 1024) throw new BadRequestException('El archivo supera el límite de 25 MB.');

    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
    const key = `organizations/${ownerOrganizationId ?? 'shared'}/media/${randomUUID()}${extension}`;
    const url = await this.storage.upload(key, file);
    const media = await this.prisma.mediaAsset.create({ data: {
      organizationId: ownerOrganizationId ?? null, key, url, filename: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, orientation: orientations.has(input.orientation as MediaOrientation) ? (input.orientation as MediaOrientation) : this.orientation(file),
      links: { create: { ownerType: input.ownerType, ownerId: input.ownerId, purpose, position: Number(input.position ?? 0) || 0, isFeatured: input.isFeatured === 'true' } },
    }, include: { links: true } });
    return media;
  }

  async list(ownerType: string, ownerId: string, actor: { accountId: string; role: string }) {
    this.assertOwnerType(ownerType);
    const organizationId = await this.ownerOrganizationId(ownerType, ownerId);
    await this.assertAccess(organizationId, actor.accountId, actor.role);
    return this.prisma.mediaLink.findMany({ where: { ownerType, ownerId }, include: { media: true }, orderBy: [{ purpose: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }] });
  }

  async library(organizationId: string, actor: { accountId: string; role: string }) {
    await this.assertAccess(organizationId, actor.accountId, actor.role);
    return this.prisma.mediaAsset.findMany({ where: { organizationId }, include: { links: true }, orderBy: { createdAt: 'desc' } });
  }

  async attach(mediaId: string, input: { ownerType: string; ownerId: string; purpose?: string; position?: number; isFeatured?: boolean }, actor: { accountId: string; role: string }) {
    this.assertOwnerType(input.ownerType);
    const organizationId = await this.ownerOrganizationId(input.ownerType, input.ownerId);
    await this.assertAccess(organizationId, actor.accountId, actor.role);
    const media = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Recurso multimedia no encontrado.');
    if (media.organizationId && media.organizationId !== organizationId) throw new ForbiddenException('El recurso pertenece a otra organización.');
    return this.prisma.mediaLink.upsert({ where: { mediaId_ownerType_ownerId_purpose: { mediaId, ownerType: input.ownerType, ownerId: input.ownerId, purpose: this.assertPurpose(input.purpose) } }, update: { position: input.position ?? 0, isFeatured: input.isFeatured ?? false }, create: { mediaId, ownerType: input.ownerType, ownerId: input.ownerId, purpose: this.assertPurpose(input.purpose), position: input.position ?? 0, isFeatured: input.isFeatured ?? false }, include: { media: true } });
  }

  async reorder(ownerType: string, ownerId: string, items: Array<{ id: string; position: number; isFeatured?: boolean }>, actor: { accountId: string; role: string }) {
    this.assertOwnerType(ownerType);
    await this.assertAccess(await this.ownerOrganizationId(ownerType, ownerId), actor.accountId, actor.role);
    await this.prisma.$transaction(items.map((item) => this.prisma.mediaLink.updateMany({ where: { id: item.id, ownerType, ownerId }, data: { position: item.position, ...(item.isFeatured === undefined ? {} : { isFeatured: item.isFeatured }) } })));
    return this.list(ownerType, ownerId, actor);
  }

  async unlink(linkId: string, actor: { accountId: string; role: string }) {
    const link = await this.prisma.mediaLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Vínculo multimedia no encontrado.');
    await this.assertAccess(await this.ownerOrganizationId(link.ownerType, link.ownerId), actor.accountId, actor.role);
    await this.prisma.mediaLink.delete({ where: { id: linkId } });
    const remaining = await this.prisma.mediaLink.count({ where: { mediaId: link.mediaId } });
    if (remaining === 0) {
      const media = await this.prisma.mediaAsset.findUnique({ where: { id: link.mediaId } });
      if (media) { await this.storage.remove(media.key); await this.prisma.mediaAsset.delete({ where: { id: media.id } }); }
    }
    return { deleted: true, removedFromStorage: remaining === 0 };
  }

  async remove(mediaId: string, actor: { accountId: string; role: string }) {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Recurso multimedia no encontrado.');
    await this.assertAccess(media.organizationId ?? undefined, actor.accountId, actor.role);
    await this.storage.remove(media.key);
    await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
    return { deleted: true };
  }
}
