create extension if not exists pg_trgm;

create index idx_photo_releases_name_trgm on photo_releases using gin (name_lower gin_trgm_ops);
create index idx_photo_releases_email_trgm on photo_releases using gin (email_normalized gin_trgm_ops);
create index idx_photo_releases_phone_trgm on photo_releases using gin (phone_normalized gin_trgm_ops);
