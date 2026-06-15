-- Store a small thumbnail alongside each screenshot so the admin portal can load
-- lightweight images in grids/filmstrips and only fetch the full-resolution PNG
-- when a screenshot is opened. Existing rows keep thumbnail_path NULL and fall
-- back to the full image.
alter table public.screenshots
  add column if not exists thumbnail_path text;
