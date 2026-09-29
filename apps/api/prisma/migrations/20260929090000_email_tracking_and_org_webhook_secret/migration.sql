-- Seguimiento de correo y secreto firmado de Resend por institución.
ALTER TABLE "organization_email_settings"
  ADD COLUMN IF NOT EXISTS "resend_webhook_secret_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "resend_webhook_id" TEXT,
  ADD COLUMN IF NOT EXISTS "resend_webhook_endpoint" TEXT,
  ADD COLUMN IF NOT EXISTS "resend_webhook_events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "resend_webhook_status" TEXT;

ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'BOUNCED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'COMPLAINED';

ALTER TABLE "email_deliveries"
  ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opened_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clicked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bounced_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "complained_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "open_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "click_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tracking_token" UUID;

ALTER TABLE "email_deliveries"
  ADD COLUMN IF NOT EXISTS "campaign_id" UUID;
ALTER TABLE "email_deliveries" ALTER COLUMN "automation_id" DROP NOT NULL;
ALTER TABLE "email_deliveries" ALTER COLUMN "step_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "email_deliveries_campaign_id_status_idx" ON "email_deliveries"("campaign_id", "status");
ALTER TABLE "email_deliveries"
  ADD CONSTRAINT "email_deliveries_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "email_deliveries" SET "tracking_token" = gen_random_uuid() WHERE "tracking_token" IS NULL;
ALTER TABLE "email_deliveries" ALTER COLUMN "tracking_token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "email_deliveries_tracking_token_key" ON "email_deliveries"("tracking_token");

CREATE TABLE IF NOT EXISTS "email_tracking_events" (
  "id" UUID NOT NULL,
  "delivery_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_tracking_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_tracking_events_delivery_id_fkey"
    FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_tracking_events_delivery_id_type_idx" ON "email_tracking_events"("delivery_id", "type");
CREATE INDEX IF NOT EXISTS "email_tracking_events_occurred_at_idx" ON "email_tracking_events"("occurred_at");
