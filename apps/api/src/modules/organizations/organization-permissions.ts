import type { MemberRole } from '@prisma/client';

export const organizationPermissions: Record<MemberRole, readonly string[]> = {
  OWNER: ['organization:read', 'organization:manage', 'members:manage', 'events:manage', 'billing:read'],
  ADMIN: ['organization:read', 'organization:manage', 'members:manage', 'events:manage'],
  EDITOR: ['organization:read', 'events:manage'],
  MEMBER: ['organization:read'],
};
