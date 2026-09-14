ALTER TABLE "registration_forms"
  ADD COLUMN IF NOT EXISTS "thank_you_message" TEXT,
  ADD COLUMN IF NOT EXISTS "thank_you_redirect_url" TEXT;
