-- OG share fields for album sub-sites (Zalo/Facebook link preview)
ALTER TABLE album_pages ADD COLUMN IF NOT EXISTS share_image_url TEXT DEFAULT '';
ALTER TABLE album_pages ADD COLUMN IF NOT EXISTS share_description TEXT DEFAULT '';
