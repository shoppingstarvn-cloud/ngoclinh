-- Cảm xúc bấm n lần (không bật/tắt): mỗi lần bấm = +1.
-- Chạy trong Supabase → SQL Editor (project pglbhoitmcflpvoasewr). Idempotent.

-- 1) Bỏ UNIQUE (media_id, user_id) — trước đây 1 người chỉ 1 cảm xúc / ảnh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'album_reactions'
      AND n.nspname = 'public'
      AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.album_reactions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.album_reactions_media_id_user_id_key;

CREATE INDEX IF NOT EXISTS idx_album_reactions_media_user_type
  ON public.album_reactions (media_id, user_id, type);

-- 2) Cảm xúc cho video/ảnh bài viết trên toàn site (target = url:...)
CREATE TABLE IF NOT EXISTS public.site_reactions (
  id          BIGSERIAL PRIMARY KEY,
  target      TEXT NOT NULL,
  user_id     BIGINT NOT NULL,
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_reactions_target
  ON public.site_reactions (target);

CREATE INDEX IF NOT EXISTS idx_site_reactions_target_user_type
  ON public.site_reactions (target, user_id, type);

ALTER TABLE public.site_reactions ENABLE ROW LEVEL SECURITY;

-- Bỏ CHECK type cũ (like/love/haha/wow/sad/angry) nếu còn, để nhận Yêu / tim / 🎉 / 😍 / 👏 / 😂
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'album_reactions'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.album_reactions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

GRANT ALL ON TABLE public.site_reactions TO service_role;
DO $$
BEGIN
  GRANT USAGE, SELECT ON SEQUENCE public.site_reactions_id_seq TO service_role;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
