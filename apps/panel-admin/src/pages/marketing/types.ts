export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "ARCHIVED"
export type CampaignChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH"

export interface Campaign {
  id: string
  campaignNumber: number
  name: string
  subject: string
  previewText?: string
  senderName: string
  senderEmail: string
  replyTo?: string
  status: CampaignStatus
  createdAt: string
  sentAt?: string
  scheduledAt?: string
  channel: CampaignChannel
  segmentIds: string[]
  segmentNames?: string[]
  recipientCount: number
  thumbnailUrl?: string
  stats?: {
    delivered: number
    deliveredRate: number
    opens: number
    openRate: number
    clicks: number
    clickRate: number
    unsubscribes: number
    unsubscribeRate: number
    bounces?: number
    bounceRate?: number
  }
  content?: string
  templateId?: string
  sourceTemplateId?: string
  tags?: string[]
}

export interface Automation {
  id: string
  name: string
  trigger: "REGISTRATION" | "EVENT_REMINDER" | "EVENT_ATTENDED" | "CERTIFICATE_ISSUED" | "CUSTOM"
  channel: "EMAIL" | "SMS" | "WHATSAPP"
  active: boolean
  segmentIds: string[]
  createdAt: string
  sentCount: number
  description?: string
}

export interface Contact {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  status: "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED"
  tags: string[]
  createdAt: string
}

export interface Segment {
  id: string
  name: string
  description?: string
  createdAt: string
  _count?: {
    members: number
  }
}
