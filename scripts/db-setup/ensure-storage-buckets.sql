-- ============================================================
-- Ensure all required Supabase Storage buckets exist
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. media — תכנים, פוסטים, תמונות, וידאו, PDF (Social module + Content Bank)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  20971520, -- 20MB
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4','video/mpeg','video/quicktime','video/webm','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. call-recordings — הקלטות שיחות (System module)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  209715200, -- 200MB
  ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/webm','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. operations-files — קבצי תפעול, חתימות, צרופות קריאות שירות (Operations module)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operations-files',
  'operations-files',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. attachments — אווטרים, משימות (Nexus), לוגואים, client avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml','video/mp4','video/mpeg','video/quicktime','video/webm','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. public-assets — תמונות Landing page (public bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,  -- PUBLIC — landing page assets need to be publicly accessible
  10485760, -- 10MB
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. meeting-recordings — הקלטות פגישות (Client OS module)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  false,
  1073741824, -- 1GB
  ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/webm','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Verify
-- ============================================================
SELECT id, name, public, file_size_limit FROM storage.buckets
WHERE id IN ('media', 'call-recordings', 'operations-files', 'attachments', 'public-assets', 'meeting-recordings')
ORDER BY id;
