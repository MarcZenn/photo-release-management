alter table consent_tokens add column event_id uuid references events(id);

alter table photo_releases add column event_id uuid references events(id);
alter table photo_releases add column appearance_description text
  check (appearance_description is null or char_length(appearance_description) <= 500);

create index idx_photo_releases_event_id on photo_releases (event_id);
