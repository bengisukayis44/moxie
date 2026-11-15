-- Moxie v1: ürün → kombin → deneme modeli.
-- Eski "paylaşım" (posts) yapısı kaldırılır; kullanıcılar, ölçüler, markalar, kategoriler,
-- yakınlık ayarları ve gelişmiş özellik tanımları korunur.

-- ─────────────────────────────────────────────────────────────
-- Eski yapıyı kaldır
-- ─────────────────────────────────────────────────────────────

drop function if exists public.search_posts(text, text, text, text, numeric, numeric, numeric, numeric, boolean, int, text, text, boolean, int, int, jsonb);
drop function if exists public.get_post(uuid);
drop function if exists public.create_post(text, jsonb, jsonb);
drop function if exists public.update_post(uuid, text, jsonb, jsonb);
drop function if exists public.write_post_children(uuid, uuid, jsonb, jsonb);
drop function if exists public.admin_reports();
drop function if exists public.admin_set_post_status(uuid, text);
drop function if exists public.admin_dismiss_reports(uuid);
drop table if exists public.likes, public.saves, public.reports, public.post_items,
  public.post_photos, public.post_measurements, public.posts cascade;

-- ─────────────────────────────────────────────────────────────
-- Kullanıcılar: rol, güven, askıya alma, tarzlar, sayaçlar
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'creator', 'admin')),
  add column is_trusted boolean not null default false,  -- true ise denemeleri onaysız yayınlanır
  add column is_suspended boolean not null default false,
  add column style_tags text[] not null default '{}',
  add column follower_count int not null default 0,
  add column following_count int not null default 0;

update public.profiles set role = 'admin', is_trusted = true where id in (select user_id from public.admins);

alter table public.profile_private
  add column notify_new_looks boolean not null default true;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.can_create_looks() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('creator', 'admin') and not is_suspended)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_birth int;
  v_kvkk boolean := coalesce(new.raw_user_meta_data->>'kvkk', '') = 'true';
  v_name text := nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), '');
  v_admin boolean := exists (select 1 from public.admin_emails where lower(email) = lower(new.email));
begin
  if (new.raw_user_meta_data->>'birth_year') ~ '^\d{4}$' then
    v_birth := (new.raw_user_meta_data->>'birth_year')::int;
    if extract(year from now())::int - v_birth < public.min_age() then
      raise exception 'underage' using errcode = 'P0001';
    end if;
  end if;

  insert into public.profiles (id, username, display_name, role, is_trusted)
  values (new.id, 'u_' || substr(replace(new.id::text, '-', ''), 1, 10), left(v_name, 50),
          case when v_admin then 'admin' else 'user' end, v_admin);

  insert into public.profile_private (user_id, birth_year, kvkk_accepted_at, onboarding_step)
  values (new.id, v_birth, case when v_kvkk then now() end,
          case when v_birth is not null and v_kvkk then 2 else 1 end);
  return new;
end $$;

drop table public.admins;

grant update (username, display_name, avatar_url, bio, style_tags) on public.profiles to authenticated;
grant update (notify_new_looks) on public.profile_private to authenticated;

-- Tarz etiketleri (onboarding'de ilgi alanı, kombinlerde etiket)
create table public.style_tags (
  slug text primary key,
  label text not null,
  position int not null default 0
);
insert into public.style_tags (slug, label, position) values
  ('gunluk', 'Günlük', 1), ('ofis', 'Ofis', 2), ('gece', 'Gece', 3), ('spor-sik', 'Spor şık', 4),
  ('minimal', 'Minimal', 5), ('klasik', 'Klasik', 6), ('sokak', 'Sokak stili', 7), ('bohem', 'Bohem', 8),
  ('romantik', 'Romantik', 9), ('tatil', 'Tatil', 10), ('ozel-gun', 'Özel gün', 11), ('tesettur', 'Tesettür', 12),
  ('kis', 'Kış', 13), ('yaz', 'Yaz', 14);

-- Engelleme kontrolü: iki kişiden biri diğerini engellediyse birbirlerinin içeriğini görmezler
create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create or replace function public.visible_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is null or p_user is null or not exists (
    select 1 from public.blocks
     where (blocker_id = auth.uid() and blocked_id = p_user)
        or (blocker_id = p_user and blocked_id = auth.uid()))
$$;

create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

-- ─────────────────────────────────────────────────────────────
-- Ürünler ve kombinler
-- ─────────────────────────────────────────────────────────────

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  category text references public.categories on update cascade,
  store text check (char_length(store) <= 40),                     -- trendyol | zara | ...
  url text check (url ~ '^https?://' and char_length(url) <= 2000),
  affiliate_url text check (affiliate_url ~ '^https?://' and char_length(affiliate_url) <= 2000),
  image_path text check (char_length(image_path) <= 2000),
  price numeric check (price >= 0),
  in_stock boolean not null default true,
  last_checked_at timestamptz default now(),
  attributes jsonb not null default '{}',                          -- renk, kumaş, kol boyu...
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index products_brand_idx on public.products (brand_id);

create table public.looks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  style_tags text[] not null default '{}',
  is_featured boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'removed', 'archived')),
  tryon_count int not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index looks_published_idx on public.looks (status, is_featured desc, published_at desc);
create index looks_creator_idx on public.looks (creator_id);

-- İlham kaynağı notu: iç kullanım, herkese gösterilmez
create table public.look_notes (
  look_id uuid primary key references public.looks on delete cascade,
  inspiration_note text check (char_length(inspiration_note) <= 1000)
);

create table public.look_photos (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks on delete cascade,
  storage_path text not null,
  position int not null default 0
);
create index look_photos_look_idx on public.look_photos (look_id, position);

create table public.look_items (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks on delete cascade,
  product_id uuid not null references public.products on delete restrict,
  position int not null default 0
);
create index look_items_look_idx on public.look_items (look_id, position);
create index look_items_product_idx on public.look_items (product_id);

-- ─────────────────────────────────────────────────────────────
-- Denemeler
-- ─────────────────────────────────────────────────────────────

create table public.tryons (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  note text check (char_length(note) <= 500),
  is_first boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'hidden', 'removed')),
  reject_reason text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (look_id, user_id)   -- bir kişi bir kombini bir kez dener (düzenleyebilir)
);
create index tryons_look_idx on public.tryons (look_id, status);
create index tryons_user_idx on public.tryons (user_id, created_at desc);
create index tryons_published_idx on public.tryons (status, published_at desc);

-- Deneme anındaki ölçüler (snapshot): ham hali sadece sahibine
create table public.tryon_measurements (
  tryon_id uuid primary key references public.tryons on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  snapshot jsonb not null,
  visibility jsonb not null default '{}'
);

create table public.tryon_photos (
  id uuid primary key default gen_random_uuid(),
  tryon_id uuid not null references public.tryons on delete cascade,
  storage_path text not null,
  position int not null default 0,
  pose text check (pose in ('front', 'side', 'sitting', 'other'))
);
create index tryon_photos_tryon_idx on public.tryon_photos (tryon_id, position);

create table public.tryon_items (
  id uuid primary key default gen_random_uuid(),
  tryon_id uuid not null references public.tryons on delete cascade,
  look_item_id uuid not null references public.look_items on delete cascade,
  worn text not null check (worn in ('same', 'similar', 'not_worn')),
  similar_brand text check (char_length(similar_brand) <= 60),
  similar_name text check (char_length(similar_name) <= 120),
  similar_url text check (similar_url ~ '^https?://' and char_length(similar_url) <= 2000),
  size_bought text check (char_length(size_bought) <= 12),
  fit_rating text check (fit_rating in ('tight', 'true', 'loose')),
  length_rating text check (length_rating in ('short', 'true', 'long')),
  fit_note text check (char_length(fit_note) <= 500),
  fabric_note text check (char_length(fabric_note) <= 500),
  unique (tryon_id, look_item_id),
  check (worn = 'not_worn' or size_bought is not null)
);
create index tryon_items_look_item_idx on public.tryon_items (look_item_id);

-- ─────────────────────────────────────────────────────────────
-- Etkileşim, bildirim, şikayet, tıklama
-- ─────────────────────────────────────────────────────────────

create table public.look_likes (
  user_id uuid not null references public.profiles on delete cascade,
  look_id uuid not null references public.looks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, look_id)
);
create index look_likes_look_idx on public.look_likes (look_id);

create table public.tryon_likes (
  user_id uuid not null references public.profiles on delete cascade,
  tryon_id uuid not null references public.tryons on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tryon_id)
);
create index tryon_likes_tryon_idx on public.tryon_likes (tryon_id);

create table public.look_saves (
  user_id uuid not null references public.profiles on delete cascade,
  look_id uuid not null references public.looks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, look_id)
);
create index look_saves_look_idx on public.look_saves (look_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,     -- alıcı
  type text not null check (type in ('follow', 'tryon_on_your_look', 'like_look', 'like_tryon',
                                     'tryon_approved', 'tryon_rejected', 'new_look', 'look_archived')),
  actor_id uuid references public.profiles on delete cascade,
  look_id uuid references public.looks on delete cascade,
  tryon_id uuid references public.tryons on delete cascade,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null default auth.uid(),
  target_type text not null check (target_type in ('look', 'tryon', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  unique (reporter_id, target_type, target_id)
);
create index reports_target_idx on public.reports (target_type, target_id);

create table public.link_clicks (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products on delete cascade,
  source_type text check (source_type in ('look', 'tryon', 'product')),
  source_id uuid,
  user_id uuid references public.profiles on delete set null,
  clicked_at timestamptz not null default now()
);
create index link_clicks_product_idx on public.link_clicks (product_id, clicked_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS ve grant'ler
-- ─────────────────────────────────────────────────────────────

alter table public.style_tags enable row level security;
alter table public.blocks enable row level security;
alter table public.follows enable row level security;
alter table public.products enable row level security;
alter table public.looks enable row level security;
alter table public.look_notes enable row level security;
alter table public.look_photos enable row level security;
alter table public.look_items enable row level security;
alter table public.tryons enable row level security;
alter table public.tryon_measurements enable row level security;
alter table public.tryon_photos enable row level security;
alter table public.tryon_items enable row level security;
alter table public.look_likes enable row level security;
alter table public.tryon_likes enable row level security;
alter table public.look_saves enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.link_clicks enable row level security;

create policy "tarzlar okunur" on public.style_tags for select using (true);

create policy "kendi engellediklerini görür" on public.blocks for select using (blocker_id = auth.uid());
create policy "engeller" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "engeli kaldırır" on public.blocks for delete using (blocker_id = auth.uid());

create policy "takip listeleri açık" on public.follows for select using (true);
create policy "takip eder" on public.follows for insert
  with check (follower_id = auth.uid() and public.visible_user(following_id));
create policy "takibi bırakır" on public.follows for delete using (follower_id = auth.uid());

create policy "ürünler okunur" on public.products for select using (true);

create policy "yayındaki kombinler okunur" on public.looks for select using (
  (status = 'published' and public.visible_user(creator_id)) or creator_id = auth.uid() or public.is_admin());
create policy "ilham notu sadece sahibine ve admine" on public.look_notes for select using (
  public.is_admin() or exists (select 1 from public.looks l where l.id = look_id and l.creator_id = auth.uid()));
create policy "görünür kombinin fotoğrafları" on public.look_photos for select
  using (exists (select 1 from public.looks l where l.id = look_id));
create policy "görünür kombinin ürünleri" on public.look_items for select
  using (exists (select 1 from public.looks l where l.id = look_id));

create policy "yayındaki denemeler okunur" on public.tryons for select using (
  (status = 'published' and public.visible_user(user_id)) or user_id = auth.uid() or public.is_admin());
create policy "kendi denemesini siler" on public.tryons for delete using (user_id = auth.uid());
create policy "snapshot sadece sahibine" on public.tryon_measurements for select using (user_id = auth.uid());
create policy "görünür denemenin fotoğrafları" on public.tryon_photos for select
  using (exists (select 1 from public.tryons t where t.id = tryon_id));
create policy "görünür denemenin parçaları" on public.tryon_items for select
  using (exists (select 1 from public.tryons t where t.id = tryon_id));

create policy "kendi beğenilerini okur" on public.look_likes for select using (user_id = auth.uid());
create policy "kombin beğenir" on public.look_likes for insert with check (user_id = auth.uid());
create policy "kombin beğenisini geri alır" on public.look_likes for delete using (user_id = auth.uid());
create policy "kendi deneme beğenilerini okur" on public.tryon_likes for select using (user_id = auth.uid());
create policy "deneme beğenir" on public.tryon_likes for insert with check (user_id = auth.uid());
create policy "deneme beğenisini geri alır" on public.tryon_likes for delete using (user_id = auth.uid());
create policy "kendi kaydettiklerini okur" on public.look_saves for select using (user_id = auth.uid());
create policy "kombin kaydeder" on public.look_saves for insert with check (user_id = auth.uid());
create policy "kaydı geri alır" on public.look_saves for delete using (user_id = auth.uid());

create policy "kendi bildirimlerini okur" on public.notifications for select using (user_id = auth.uid());
create policy "bildirimi okundu yapar" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "şikayet eder" on public.reports for insert with check (reporter_id = auth.uid());
create policy "admin şikayetleri okur" on public.reports for select using (public.is_admin());

revoke all on public.style_tags, public.blocks, public.follows, public.products, public.looks, public.look_notes,
  public.look_photos, public.look_items, public.tryons, public.tryon_measurements, public.tryon_photos,
  public.tryon_items, public.look_likes, public.tryon_likes, public.look_saves, public.notifications,
  public.reports, public.link_clicks from anon, authenticated;
grant select on public.style_tags, public.follows, public.products, public.looks, public.look_photos,
  public.look_items, public.tryons, public.tryon_photos, public.tryon_items to anon, authenticated;
grant select on public.blocks, public.look_notes, public.tryon_measurements, public.look_likes, public.tryon_likes,
  public.look_saves, public.notifications, public.reports to authenticated;
grant insert, delete on public.blocks, public.follows, public.look_likes, public.tryon_likes, public.look_saves to authenticated;
grant delete on public.tryons to authenticated;
grant insert on public.reports to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tetikleyiciler: sayaçlar, ilk deneme, güven, bildirimler, engelleme, otomatik gizleme
-- ─────────────────────────────────────────────────────────────

create or replace function public.notify(p_user uuid, p_type text, p_actor uuid, p_look uuid, p_tryon uuid, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, actor_id, look_id, tryon_id, data)
  select p_user, p_type, p_actor, p_look, p_tryon, coalesce(p_data, '{}')
   where p_user is not null and p_user is distinct from p_actor
$$;
revoke execute on function public.notify(uuid, text, uuid, uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.on_follow_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    perform public.notify(new.following_id, 'follow', new.follower_id, null, null);
  else
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
  end if;
  return null;
end $$;
create trigger follows_change after insert or delete on public.follows
  for each row execute function public.on_follow_change();

-- Engelleyince iki yöndeki takip silinir
create or replace function public.on_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end $$;
create trigger blocks_insert after insert on public.blocks
  for each row execute function public.on_block();

-- Deneme yayına girerken: yayın tarihi ve "ilk deneyen"
create or replace function public.before_tryon_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
    if not exists (select 1 from public.tryons where look_id = new.look_id and is_first and id <> new.id) then
      new.is_first := true;
    end if;
  end if;
  return new;
end $$;
create trigger tryons_before_write before insert or update on public.tryons
  for each row execute function public.before_tryon_write();

create or replace function public.after_tryon_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_look uuid := coalesce(new.look_id, old.look_id); v_creator uuid;
begin
  update public.looks set tryon_count = (
    select count(*) from public.tryons where look_id = v_look and status = 'published') where id = v_look;
  if tg_op = 'DELETE' then return null; end if;

  select creator_id into v_creator from public.looks where id = new.look_id;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform public.notify(v_creator, 'tryon_on_your_look', new.user_id, new.look_id, new.id);
    if tg_op = 'UPDATE' and old.status = 'pending' then
      perform public.notify(new.user_id, 'tryon_approved', null, new.look_id, new.id);
      -- 2 denemesi onaylanan kullanıcı güvenilir olur
      update public.profiles set is_trusted = true
       where id = new.user_id and not is_trusted
         and (select count(*) from public.tryons where user_id = new.user_id and status = 'published') >= 2;
    end if;
  elsif new.status = 'rejected' and tg_op = 'UPDATE' and old.status is distinct from 'rejected' then
    perform public.notify(new.user_id, 'tryon_rejected', null, new.look_id, new.id,
                          jsonb_build_object('reason', new.reject_reason));
  end if;
  return null;
end $$;
create trigger tryons_after_write after insert or update or delete on public.tryons
  for each row execute function public.after_tryon_write();

-- Kombin yayınlanınca takipçilere bildirim (tercihi açık olanlara)
create or replace function public.after_look_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications (user_id, type, actor_id, look_id)
    select f.follower_id, 'new_look', new.creator_id, new.id
      from public.follows f
      join public.profile_private pp on pp.user_id = f.follower_id and pp.notify_new_looks
     where f.following_id = new.creator_id;
  end if;
  return null;
end $$;
create trigger looks_after_write after insert or update of status on public.looks
  for each row execute function public.after_look_write();

create or replace function public.before_look_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;
create trigger looks_before_write before insert or update on public.looks
  for each row execute function public.before_look_write();

create or replace function public.on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'look_likes' then
    perform public.notify((select creator_id from public.looks where id = new.look_id), 'like_look', new.user_id, new.look_id, null);
  else
    perform public.notify((select user_id from public.tryons where id = new.tryon_id), 'like_tryon', new.user_id,
                          (select look_id from public.tryons where id = new.tryon_id), new.tryon_id);
  end if;
  return null;
end $$;
create trigger look_likes_insert after insert on public.look_likes for each row execute function public.on_like();
create trigger tryon_likes_insert after insert on public.tryon_likes for each row execute function public.on_like();

-- 3 farklı kişiden açık şikayet alan içerik otomatik gizlenir (admin kuyruğunda kalır)
create or replace function public.on_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(distinct reporter_id) from public.reports
       where target_type = new.target_type and target_id = new.target_id and resolved_at is null) >= 3 then
    if new.target_type = 'look' then
      update public.looks set status = 'hidden' where id = new.target_id and status = 'published';
    elsif new.target_type = 'tryon' then
      update public.tryons set status = 'hidden' where id = new.target_id and status = 'published';
    end if;
  end if;
  return null;
end $$;
create trigger reports_insert after insert on public.reports for each row execute function public.on_report();

-- Hesap silinirken: kişinin kombinleri arşivlenir, o kombinlere deneme eklemiş diğer kişilere bildirilir
create or replace function public.before_profile_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, look_id, data)
  select distinct t.user_id, 'look_archived', l.id, jsonb_build_object('title', l.title)
    from public.looks l join public.tryons t on t.look_id = l.id
   where l.creator_id = old.id and t.user_id <> old.id;
  update public.looks set status = 'archived', is_featured = false where creator_id = old.id;
  return old;
end $$;
create trigger profiles_before_delete before delete on public.profiles
  for each row execute function public.before_profile_delete();

-- ─────────────────────────────────────────────────────────────
-- Yazma RPC'leri
-- ─────────────────────────────────────────────────────────────

create or replace function public.assert_active() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_suspended) then raise exception 'suspended'; end if;
  return v_uid;
end $$;

-- p: {"brand": "Zara", "name": "...", "category": "jean", "store": "zara", "url": "...", "affiliate_url": "...",
--     "image_path": "...", "price": 999.9, "attributes": {...}}
create or replace function public.save_product(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_active(); v_id uuid := p_id;
begin
  if not public.can_create_looks() then raise exception 'forbidden'; end if;
  if v_id is null then
    insert into public.products (brand_id, name, category, store, url, affiliate_url, image_path, price, attributes, created_by)
    values (public.resolve_brand(p->>'brand'), trim(p->>'name'), nullif(p->>'category', ''), nullif(trim(p->>'store'), ''),
            nullif(trim(p->>'url'), ''), nullif(trim(p->>'affiliate_url'), ''), nullif(p->>'image_path', ''),
            nullif(p->>'price', '')::numeric, public.clean_attributes(p->'attributes'), v_uid)
    returning id into v_id;
  else
    if not (public.is_admin() or exists (select 1 from public.products where id = v_id and created_by = v_uid)) then
      raise exception 'forbidden';
    end if;
    update public.products set
      brand_id = public.resolve_brand(p->>'brand'), name = trim(p->>'name'), category = nullif(p->>'category', ''),
      store = nullif(trim(p->>'store'), ''), url = nullif(trim(p->>'url'), ''),
      affiliate_url = nullif(trim(p->>'affiliate_url'), ''), image_path = nullif(p->>'image_path', ''),
      price = nullif(p->>'price', '')::numeric, attributes = public.clean_attributes(p->'attributes'),
      last_checked_at = now()
     where id = v_id;
  end if;
  return v_id;
end $$;

-- photos: ["<uid>/x.webp", ...]; product_ids sıralı
create or replace function public.save_look(
  p_id uuid, p_title text, p_description text, p_style_tags text[], p_note text,
  p_photos jsonb, p_product_ids uuid[], p_status text default 'published'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_active(); v_id uuid := p_id; ph text; i int := 0; pid uuid;
begin
  if not public.can_create_looks() then raise exception 'forbidden'; end if;
  if p_status not in ('draft', 'published') then raise exception 'status'; end if;
  if jsonb_array_length(coalesce(p_photos, '[]')) not between 1 and 6 then raise exception 'photos_count'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) not between 1 and 12 then raise exception 'items_count'; end if;

  if v_id is null then
    insert into public.looks (creator_id, title, description, style_tags, status)
    values (v_uid, trim(p_title), nullif(trim(p_description), ''),
            array(select s from unnest(p_style_tags) s where s in (select slug from public.style_tags)), p_status)
    returning id into v_id;
  else
    if not (public.is_admin() or exists (select 1 from public.looks where id = v_id and creator_id = v_uid)) then
      raise exception 'forbidden';
    end if;
    update public.looks set title = trim(p_title), description = nullif(trim(p_description), ''),
      style_tags = array(select s from unnest(p_style_tags) s where s in (select slug from public.style_tags)),
      status = case when status in ('draft', 'published') then p_status else status end
     where id = v_id;
    delete from public.look_photos where look_id = v_id;
    -- Denemesi olan parçalar silinmez; sadece sıra güncellenir ve yeni ürünler eklenir
    delete from public.look_items li where li.look_id = v_id and li.product_id <> all (p_product_ids)
      and not exists (select 1 from public.tryon_items ti where ti.look_item_id = li.id);
  end if;

  for ph in select * from jsonb_array_elements_text(p_photos) loop
    if split_part(ph, '/', 1) <> v_uid::text and not public.is_admin() then raise exception 'photo_path'; end if;
    insert into public.look_photos (look_id, storage_path, position) values (v_id, ph, i);
    i := i + 1;
  end loop;

  i := 0;
  foreach pid in array p_product_ids loop
    if exists (select 1 from public.look_items where look_id = v_id and product_id = pid) then
      update public.look_items set position = i where look_id = v_id and product_id = pid;
    else
      insert into public.look_items (look_id, product_id, position) values (v_id, pid, i);
    end if;
    i := i + 1;
  end loop;

  insert into public.look_notes (look_id, inspiration_note) values (v_id, nullif(trim(p_note), ''))
  on conflict (look_id) do update set inspiration_note = excluded.inspiration_note;
  return v_id;
end $$;

-- photos: [{"path": "<uid>/x.webp", "pose": "front"}]
-- items:  [{"look_item_id": "...", "worn": "same|similar|not_worn", "size_bought": "38", "fit_rating": "true",
--           "length_rating": "long", "fit_note": "...", "fabric_note": "...",
--           "similar_brand": "...", "similar_name": "...", "similar_url": "..."}]
create or replace function public.save_tryon(p_look uuid, p_note text, p_photos jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.assert_active(); v_id uuid; v_status text; v_prev text; v_auto boolean;
  ph jsonb; it jsonb; i int := 0; v_creator uuid;
begin
  select creator_id into v_creator from public.looks where id = p_look and status = 'published';
  if not found then raise exception 'look_not_found'; end if;
  if not public.visible_user(v_creator) then raise exception 'blocked'; end if;
  if jsonb_array_length(coalesce(p_photos, '[]')) not between 1 and 4 then raise exception 'photos_count'; end if;

  select (is_trusted or role in ('creator', 'admin')) into v_auto from public.profiles where id = v_uid;
  select id, status into v_id, v_prev from public.tryons where look_id = p_look and user_id = v_uid;
  -- Güvenilir hesaplar doğrudan yayına; diğerleri (düzenleme dahil) onay kuyruğuna
  v_status := case when v_auto then 'published' else 'pending' end;
  if v_prev in ('hidden', 'removed') then raise exception 'locked'; end if;

  if v_id is null then
    insert into public.tryons (look_id, user_id, note, status) values (p_look, v_uid, nullif(trim(p_note), ''), v_status)
    returning id into v_id;
  else
    update public.tryons set note = nullif(trim(p_note), ''), status = v_status, reject_reason = null where id = v_id;
    delete from public.tryon_photos where tryon_id = v_id;
    delete from public.tryon_items where tryon_id = v_id;
  end if;

  for ph in select * from jsonb_array_elements(p_photos) loop
    if split_part(ph->>'path', '/', 1) <> v_uid::text then raise exception 'photo_path'; end if;
    insert into public.tryon_photos (tryon_id, storage_path, position, pose) values (v_id, ph->>'path', i, nullif(ph->>'pose', ''));
    i := i + 1;
  end loop;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    if not exists (select 1 from public.look_items where id = (it->>'look_item_id')::uuid and look_id = p_look) then
      raise exception 'item_not_in_look';
    end if;
    if it->>'worn' <> 'not_worn' and coalesce(trim(it->>'size_bought'), '') = '' then raise exception 'size_required'; end if;
    insert into public.tryon_items (tryon_id, look_item_id, worn, similar_brand, similar_name, similar_url,
      size_bought, fit_rating, length_rating, fit_note, fabric_note)
    values (v_id, (it->>'look_item_id')::uuid, it->>'worn',
      case when it->>'worn' = 'similar' then nullif(trim(it->>'similar_brand'), '') end,
      case when it->>'worn' = 'similar' then nullif(trim(it->>'similar_name'), '') end,
      case when it->>'worn' = 'similar' then nullif(trim(it->>'similar_url'), '') end,
      case when it->>'worn' <> 'not_worn' then upper(trim(it->>'size_bought')) end,
      nullif(it->>'fit_rating', ''), nullif(it->>'length_rating', ''),
      nullif(trim(it->>'fit_note'), ''), nullif(trim(it->>'fabric_note'), ''));
  end loop;

  -- Ölçüler profilden kopyalanır (rıza varsa)
  delete from public.tryon_measurements where tryon_id = v_id;
  insert into public.tryon_measurements (tryon_id, user_id, snapshot, visibility)
  select v_id, v_uid, jsonb_strip_nulls(to_jsonb(bm) - 'user_id' - 'visibility' - 'updated_at'), bm.visibility
    from public.body_measurements bm
    join public.profile_private pp on pp.user_id = bm.user_id and pp.measurement_consent_at is not null
   where bm.user_id = v_uid;

  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

-- "Mağazada gör": tıklamayı kaydeder, gidilecek linki döner (satışta değilse null)
create or replace function public.track_click(p_product uuid, p_source_type text, p_source_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_url text;
begin
  select coalesce(affiliate_url, url) into v_url from public.products where id = p_product and in_stock;
  if v_url is null then return null; end if;
  insert into public.link_clicks (product_id, source_type, source_id, user_id)
  values (p_product, case when p_source_type in ('look', 'tryon', 'product') then p_source_type end, p_source_id, auth.uid());
  return v_url;
end $$;

create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- ─────────────────────────────────────────────────────────────
-- Kart yardımcıları (maskelenmiş)
-- ─────────────────────────────────────────────────────────────

-- Denemenin ana parçası: ilk giyilen ürün (kategori + beden), yakınlık için kategori
create or replace function public.tryon_main_item(p_tryon uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('category', p.category, 'category_label', c.label, 'size', ti.size_bought)
    from public.tryon_items ti
    join public.look_items li on li.id = ti.look_item_id
    join public.products p on p.id = li.product_id
    left join public.categories c on c.slug = p.category
   where ti.tryon_id = p_tryon and ti.worn <> 'not_worn'
   order by li.position limit 1
$$;

create or replace function public.tryon_card(p_tryon uuid, p_viewer jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'kind', 'tryon',
    'id', t.id,
    'look_id', t.look_id,
    'look_title', l.title,
    'status', t.status,
    'is_first', t.is_first,
    'created_at', coalesce(t.published_at, t.created_at),
    'user', jsonb_build_object('username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url, 'role', pr.role),
    'cover_path', (select ph.storage_path from public.tryon_photos ph where ph.tryon_id = t.id order by ph.position limit 1),
    'height', public.mask_measurements(tm.snapshot, tm.visibility)->'height_cm',
    'main', public.tryon_main_item(t.id),
    'proximity', case when t.user_id = auth.uid() then null
                      else public.proximity_score(p_viewer, tm.snapshot, public.tryon_main_item(t.id)->>'category') end,
    'like_count', (select count(*) from public.tryon_likes x where x.tryon_id = t.id)
  )
  from public.tryons t
  join public.looks l on l.id = t.look_id
  join public.profiles pr on pr.id = t.user_id
  left join public.tryon_measurements tm on tm.tryon_id = t.id
  where t.id = p_tryon
$$;

create or replace function public.look_card(p_look uuid, p_viewer jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'kind', 'look',
    'id', l.id,
    'title', l.title,
    'status', l.status,
    'is_featured', l.is_featured,
    'created_at', coalesce(l.published_at, l.created_at),
    'tryon_count', l.tryon_count,
    'cover_path', (select ph.storage_path from public.look_photos ph where ph.look_id = l.id order by ph.position limit 1),
    'creator', jsonb_build_object('username', pr.username, 'avatar_url', pr.avatar_url),
    -- Giriş yapmış ve ölçüsü olan kişiye: ölçüsü yakın biri bu kombini denemiş mi
    'near_tryon', p_viewer is not null and exists (
      select 1 from public.tryons t join public.tryon_measurements tm on tm.tryon_id = t.id
       where t.look_id = l.id and t.status = 'published' and t.user_id <> auth.uid() and public.visible_user(t.user_id)
         and public.proximity_score(p_viewer, tm.snapshot, public.tryon_main_item(t.id)->>'category') >= 70),
    'save_count', (select count(*) from public.look_saves s where s.look_id = l.id)
  )
  from public.looks l
  left join public.profiles pr on pr.id = l.creator_id
  where l.id = p_look
$$;

create or replace function public.product_card(p_product uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'kind', 'product',
    'id', p.id, 'name', p.name, 'brand', b.name, 'brand_slug', b.slug,
    'category', p.category, 'category_label', c.label,
    'store', p.store, 'image_path', p.image_path, 'price', p.price,
    'in_stock', p.in_stock, 'has_link', coalesce(p.affiliate_url, p.url) is not null,
    'is_affiliate', p.affiliate_url is not null,
    'stale', p.last_checked_at is null or p.last_checked_at < now() - interval '14 days',
    'last_checked_at', p.last_checked_at,
    'tryon_count', (select count(*) from public.tryon_items ti join public.look_items li on li.id = ti.look_item_id
                      join public.tryons t on t.id = ti.tryon_id
                     where li.product_id = p.id and ti.worn = 'same' and t.status = 'published')
  )
  from public.products p
  left join public.brands b on b.id = p.brand_id
  left join public.categories c on c.slug = p.category
  where p.id = p_product
$$;

-- ─────────────────────────────────────────────────────────────
-- Okuma RPC'leri
-- ─────────────────────────────────────────────────────────────

-- Keşfet: öne çıkanlar önce, sonra en yeni
create or replace function public.feed_explore(p_limit int default 20, p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m)
  select coalesce(jsonb_agg(public.look_card(x.id, (select m from v)) order by x.is_featured desc, x.published_at desc), '[]')
    from (select l.id, l.is_featured, l.published_at from public.looks l
           where l.status = 'published' and public.visible_user(l.creator_id)
           order by l.is_featured desc, l.published_at desc
           limit least(p_limit, 50) offset greatest(p_offset, 0)) x
$$;

-- Takip: takip edilenlerin yeni kombinleri ve denemeleri, en yeni önce
create or replace function public.feed_following(p_limit int default 20, p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m),
  f as (select following_id from public.follows where follower_id = auth.uid()),
  items as (
    select 'look' as kind, l.id, l.published_at as at from public.looks l
     where l.status = 'published' and l.creator_id in (select following_id from f)
    union all
    select 'tryon', t.id, t.published_at from public.tryons t
     where t.status = 'published' and t.user_id in (select following_id from f)
       and exists (select 1 from public.looks l where l.id = t.look_id and l.status = 'published')
    order by at desc
    limit least(p_limit, 50) offset greatest(p_offset, 0)
  )
  select coalesce(jsonb_agg(case when kind = 'look' then public.look_card(id, (select m from v))
                                 else public.tryon_card(id, (select m from v)) end order by at desc), '[]')
    from items
$$;

-- Bana yakın: ölçüleri en yakın kişilerin denemeleri
create or replace function public.feed_near(p_limit int default 20, p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m),
  scored as (
    select t.id, t.published_at,
      public.proximity_score((select m from v), tm.snapshot, public.tryon_main_item(t.id)->>'category') as score
      from public.tryons t
      join public.tryon_measurements tm on tm.tryon_id = t.id
      join public.looks l on l.id = t.look_id and l.status = 'published'
     where t.status = 'published' and t.user_id <> auth.uid() and public.visible_user(t.user_id)
  ),
  page as (
    select * from scored where score is not null
     order by score desc, published_at desc
     limit least(p_limit, 50) offset greatest(p_offset, 0)
  )
  select coalesce(jsonb_agg(public.tryon_card(id, (select m from v)) order by score desc, published_at desc), '[]') from page
$$;

create or replace function public.get_look(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m),
  tr as (
    select t.id, coalesce(t.published_at, t.created_at) as at,
      case when t.user_id = auth.uid() then null
           else public.proximity_score((select m from v), tm.snapshot, public.tryon_main_item(t.id)->>'category') end as score
      from public.tryons t
      left join public.tryon_measurements tm on tm.tryon_id = t.id
     where t.look_id = p_id and t.status = 'published' and public.visible_user(t.user_id)
  )
  select jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'description', l.description,
    'status', l.status,
    'is_featured', l.is_featured,
    'created_at', coalesce(l.published_at, l.created_at),
    'can_edit', l.creator_id = auth.uid() or public.is_admin(),
    'style_tags', coalesce((select jsonb_agg(jsonb_build_object('slug', s.slug, 'label', s.label) order by s.position)
                              from public.style_tags s where s.slug = any (l.style_tags)), '[]'),
    'creator', case when pr.id is null then null else jsonb_build_object(
                 'id', pr.id, 'username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url,
                 'role', pr.role, 'is_me', pr.id = auth.uid(),
                 'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id)) end,
    'photos', coalesce((select jsonb_agg(ph.storage_path order by ph.position) from public.look_photos ph where ph.look_id = l.id), '[]'),
    'items', coalesce((select jsonb_agg(public.product_card(li.product_id) || jsonb_build_object('look_item_id', li.id) order by li.position)
                         from public.look_items li where li.look_id = l.id), '[]'),
    'tryon_total', (select count(*) from tr),
    -- En yakın vücut önce, sonra yakınlık ve tarih; ilk sıradaki (puanı varsa) "Sana en yakın"
    'tryons', coalesce((select jsonb_agg(public.tryon_card(tr.id, (select m from v)) order by tr.score desc nulls last, tr.at desc)
                          from (select * from tr order by score desc nulls last, at desc limit 30) tr), '[]'),
    'my_tryon', (select jsonb_build_object('id', t.id, 'status', t.status, 'reject_reason', t.reject_reason)
                   from public.tryons t where t.look_id = l.id and t.user_id = auth.uid()),
    'like_count', (select count(*) from public.look_likes x where x.look_id = l.id),
    'save_count', (select count(*) from public.look_saves x where x.look_id = l.id),
    'liked', exists (select 1 from public.look_likes x where x.look_id = l.id and x.user_id = auth.uid()),
    'saved', exists (select 1 from public.look_saves x where x.look_id = l.id and x.user_id = auth.uid()),
    'similar', coalesce((
      select jsonb_agg(public.look_card(s.id, (select m from v)))
        from (select l2.id from public.looks l2
               where l2.id <> l.id and l2.status = 'published' and public.visible_user(l2.creator_id)
                 and (l2.style_tags && l.style_tags or exists (
                       select 1 from public.look_items a join public.products pa on pa.id = a.product_id
                         join public.look_items b on b.look_id = l.id join public.products pb on pb.id = b.product_id
                        where a.look_id = l2.id and (pa.id = pb.id or pa.category = pb.category)))
               order by (select count(*) from unnest(l2.style_tags) x where x = any (l.style_tags)) desc, l2.tryon_count desc, l2.published_at desc
               limit 6) s), '[]')
  )
  from public.looks l
  left join public.profiles pr on pr.id = l.creator_id
  where l.id = p_id
    and ((l.status = 'published' and public.visible_user(l.creator_id)) or l.creator_id = auth.uid() or public.is_admin())
$$;

create or replace function public.get_tryon(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'reject_reason', case when t.user_id = auth.uid() or public.is_admin() then t.reject_reason end,
    'note', t.note,
    'is_first', t.is_first,
    'is_owner', t.user_id = auth.uid(),
    'created_at', coalesce(t.published_at, t.created_at),
    'user', jsonb_build_object('id', pr.id, 'username', pr.username, 'display_name', pr.display_name,
              'avatar_url', pr.avatar_url, 'role', pr.role, 'is_me', pr.id = auth.uid(),
              'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id)),
    'measurements', public.mask_measurements(tm.snapshot, tm.visibility),
    'usual_sizes', jsonb_strip_nulls(jsonb_build_object('top', tm.snapshot->'usual_top_size', 'bottom', tm.snapshot->'usual_bottom_size')),
    'proximity', case when t.user_id = auth.uid() then null
                      else public.proximity_score(public.viewer_measurements(), tm.snapshot, public.tryon_main_item(t.id)->>'category') end,
    'photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.storage_path, 'pose', ph.pose) order by ph.position)
                          from public.tryon_photos ph where ph.tryon_id = t.id), '[]'),
    'look', jsonb_build_object('id', l.id, 'title', l.title,
              'cover_path', (select ph.storage_path from public.look_photos ph where ph.look_id = l.id order by ph.position limit 1)),
    'items', coalesce((
      select jsonb_agg(public.product_card(li.product_id) || jsonb_build_object(
               'look_item_id', li.id,
               'worn', coalesce(ti.worn, 'not_worn'),
               'size_bought', ti.size_bought, 'fit_rating', ti.fit_rating, 'length_rating', ti.length_rating,
               'fit_note', ti.fit_note, 'fabric_note', ti.fabric_note,
               'similar_brand', ti.similar_brand, 'similar_name', ti.similar_name, 'similar_url', ti.similar_url)
             order by li.position)
        from public.look_items li
        left join public.tryon_items ti on ti.look_item_id = li.id and ti.tryon_id = t.id
       where li.look_id = t.look_id), '[]'),
    'like_count', (select count(*) from public.tryon_likes x where x.tryon_id = t.id),
    'liked', exists (select 1 from public.tryon_likes x where x.tryon_id = t.id and x.user_id = auth.uid())
  )
  from public.tryons t
  join public.looks l on l.id = t.look_id
  join public.profiles pr on pr.id = t.user_id
  left join public.tryon_measurements tm on tm.tryon_id = t.id
  where t.id = p_id
    and ((t.status = 'published' and public.visible_user(t.user_id)) or t.user_id = auth.uid() or public.is_admin())
$$;

create or replace function public.get_product(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m),
  tr as (
    select t.id as tryon_id, ti.size_bought, ti.fit_rating, ti.length_rating, coalesce(t.published_at, t.created_at) as at,
      case when t.user_id = auth.uid() then null
           else public.proximity_score((select m from v), tm.snapshot, p.category) end as score
      from public.tryon_items ti
      join public.look_items li on li.id = ti.look_item_id and li.product_id = p_id
      join public.tryons t on t.id = ti.tryon_id and t.status = 'published' and public.visible_user(t.user_id)
      join public.looks l on l.id = t.look_id and l.status = 'published'
      join public.products p on p.id = li.product_id
      left join public.tryon_measurements tm on tm.tryon_id = t.id
     where ti.worn = 'same'
  )
  select public.product_card(p.id) || jsonb_build_object(
    'attribute_labels', public.attribute_labels(p.attributes),
    -- Beden özeti: kaç kişi denedi, en çok alınan beden, fit dağılımı
    'summary', jsonb_build_object(
      'count', (select count(*) from tr),
      'top_size', (select size_bought from tr group by size_bought order by count(*) desc, size_bought limit 1),
      'sizes', coalesce((select jsonb_object_agg(size_bought, n) from (select size_bought, count(*) n from tr group by size_bought) s), '{}'),
      'fit', coalesce((select jsonb_object_agg(fit_rating, n) from (select fit_rating, count(*) n from tr where fit_rating is not null group by fit_rating) s), '{}'),
      'length', coalesce((select jsonb_object_agg(length_rating, n) from (select length_rating, count(*) n from tr where length_rating is not null group by length_rating) s), '{}')),
    'tryons', coalesce((select jsonb_agg(public.tryon_card(x.tryon_id, (select m from v))
                                         || jsonb_build_object('product_size', x.size_bought, 'product_fit', x.fit_rating)
                                         order by x.score desc nulls last, x.at desc)
                          from (select * from tr order by score desc nulls last, at desc limit 40) x), '[]'),
    'looks', coalesce((select jsonb_agg(public.look_card(l.id, (select m from v)) order by l.published_at desc)
                         from public.looks l
                        where l.status = 'published' and public.visible_user(l.creator_id)
                          and exists (select 1 from public.look_items li where li.look_id = l.id and li.product_id = p.id)), '[]')
  )
  from public.products p where p.id = p_id
$$;

create or replace function public.get_profile(p_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case
    -- Profil sahibi izleyeni engellediyse içerik gösterilmez
    when exists (select 1 from public.blocks b where b.blocker_id = pr.id and b.blocked_id = auth.uid()) then
      jsonb_build_object('id', pr.id, 'username', pr.username, 'unavailable', true)
    else jsonb_build_object(
      'id', pr.id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url,
      'bio', pr.bio,
      'role', pr.role,
      'created_at', pr.created_at,
      'is_me', pr.id = auth.uid(),
      'follower_count', pr.follower_count,
      'following_count', pr.following_count,
      'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id),
      'i_blocked', exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = pr.id),
      'measurements', public.mask_measurements(to_jsonb(bm), bm.visibility),
      'usual_sizes', jsonb_strip_nulls(jsonb_build_object('top', bm.usual_top_size, 'bottom', bm.usual_bottom_size,
                       'shoe', case when coalesce(bm.visibility->>'shoe_size', 'range') = 'hidden' then null else bm.shoe_size end)),
      'proximity', case when pr.id = auth.uid() then null
                        else public.proximity_score(public.viewer_measurements(), to_jsonb(bm) - 'visibility') end,
      'tryon_count', (select count(*) from public.tryons t where t.user_id = pr.id and t.status = 'published'),
      'look_count', (select count(*) from public.looks l where l.creator_id = pr.id and l.status = 'published'))
    end
  from public.profiles pr
  left join public.body_measurements bm on bm.user_id = pr.id
  where pr.username = lower(p_username)
$$;

-- Profil sekmeleri: kind = tryons | looks | saved
create or replace function public.profile_items(p_username text, p_kind text, p_limit int default 20, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid; v_m jsonb := public.viewer_measurements(); r jsonb;
begin
  select id into v_user from public.profiles where username = lower(p_username);
  if v_user is null or not public.visible_user(v_user) then return '[]'; end if;
  if p_kind = 'tryons' then
    select coalesce(jsonb_agg(public.tryon_card(x.id, v_m) order by x.created_at desc), '[]') into r
      from (select t.id, t.created_at from public.tryons t
             where t.user_id = v_user and (t.status = 'published' or v_user = auth.uid())
             order by t.created_at desc limit least(p_limit, 50) offset greatest(p_offset, 0)) x;
  elsif p_kind = 'looks' then
    select coalesce(jsonb_agg(public.look_card(x.id, v_m) order by x.created_at desc), '[]') into r
      from (select l.id, l.created_at from public.looks l
             where l.creator_id = v_user and (l.status = 'published' or (v_user = auth.uid() and l.status = 'draft'))
             order by l.created_at desc limit least(p_limit, 50) offset greatest(p_offset, 0)) x;
  elsif p_kind = 'saved' and v_user = auth.uid() then
    select coalesce(jsonb_agg(public.look_card(x.look_id, v_m) order by x.created_at desc), '[]') into r
      from (select s.look_id, s.created_at from public.look_saves s
              join public.looks l on l.id = s.look_id and l.status = 'published' and public.visible_user(l.creator_id)
             where s.user_id = auth.uid()
             order by s.created_at desc limit least(p_limit, 50) offset greatest(p_offset, 0)) x;
  else
    r := '[]';
  end if;
  return r;
end $$;

-- kind = followers | following
create or replace function public.follow_list(p_username text, p_kind text, p_limit int default 50, p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with u as (select id from public.profiles where username = lower(p_username)),
  ids as (
    select case when p_kind = 'followers' then f.follower_id else f.following_id end as id, f.created_at
      from public.follows f, u
     where (p_kind = 'followers' and f.following_id = u.id) or (p_kind = 'following' and f.follower_id = u.id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url, 'role', pr.role,
      'is_me', pr.id = auth.uid(),
      'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id))
      order by ids.created_at desc), '[]')
    from (select * from ids order by created_at desc limit least(p_limit, 100) offset greatest(p_offset, 0)) ids
    join public.profiles pr on pr.id = ids.id
   where public.visible_user(pr.id)
$$;

-- Önerilen hesaplar: ekip/creator önce, tarzı uyanlar, çok deneme yapanlar
create or replace function public.suggested_accounts(p_limit int default 5) returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select style_tags from public.profiles where id = auth.uid())
  select coalesce(jsonb_agg(jsonb_build_object('username', x.username, 'display_name', x.display_name,
                  'avatar_url', x.avatar_url, 'role', x.role, 'is_following', false)), '[]')
    from (
      select pr.* from public.profiles pr
       where pr.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') and not pr.is_suspended
         and not pr.username like 'u\_%'
         and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id)
         and public.visible_user(pr.id)
         and (pr.role in ('creator', 'admin')
              or exists (select 1 from public.tryons t where t.user_id = pr.id and t.status = 'published'))
       order by (pr.role in ('creator', 'admin')) desc,
                (select count(*) from unnest(pr.style_tags) s where s = any (coalesce((select style_tags from me), '{}'))) desc,
                (select count(*) from public.tryons t where t.user_id = pr.id and t.status = 'published') desc,
                pr.follower_count desc
       limit least(p_limit, 20)) x
$$;

-- Bildirimler: beğeniler aynı içerik için gruplanır ("Ayşe ve 4 kişi beğendi")
create or replace function public.list_notifications(p_limit int default 50) returns jsonb
language sql stable security definer set search_path = '' as $$
  with n as (
    select n.*,
      case when n.type in ('like_look', 'like_tryon') then n.type || ':' || coalesce(n.tryon_id, n.look_id)::text
           else n.id::text end as grp
      from public.notifications n
     where n.user_id = auth.uid() and public.visible_user(n.actor_id)
  ),
  g as (
    select grp, max(created_at) as at, count(distinct actor_id) as actors, bool_or(read_at is null) as unread,
      (array_agg(id order by created_at desc))[1] as last_id
      from n group by grp
     order by max(created_at) desc limit least(p_limit, 100)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', n.id, 'type', n.type, 'created_at', g.at, 'unread', g.unread, 'data', n.data,
      'others', greatest(g.actors - 1, 0),
      'actor', case when a.id is null then null else jsonb_build_object('username', a.username, 'avatar_url', a.avatar_url) end,
      'look', case when l.id is null then null else jsonb_build_object('id', l.id, 'title', l.title) end,
      'tryon_id', n.tryon_id) order by g.at desc), '[]')
    from g
    join n on n.id = g.last_id
    left join public.profiles a on a.id = n.actor_id
    left join public.looks l on l.id = n.look_id
$$;

create or replace function public.unread_notification_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null
$$;

-- ─────────────────────────────────────────────────────────────
-- Arama
-- ─────────────────────────────────────────────────────────────

-- Kombinin arama metni: ad, açıklama, tarzlar, ürün/marka/kategori adları ve özellikler
create or replace function public.look_search_doc(p_look uuid) returns text
language sql stable security definer set search_path = '' as $$
  select public.norm(coalesce(l.title, '') || ' ' || coalesce(l.description, '') || ' ' ||
    coalesce((select string_agg(s.label, ' ') from public.style_tags s where s.slug = any (l.style_tags)), '') || ' ' ||
    coalesce((select string_agg(coalesce(b.name, '') || ' ' || array_to_string(b.aliases, ' ') || ' ' || p.name || ' ' ||
                                coalesce(c.label, '') || ' ' || array_to_string(c.search_terms, ' ') || ' ' ||
                                public.attribute_search_text(p.attributes), ' ')
                from public.look_items li
                join public.products p on p.id = li.product_id
                left join public.brands b on b.id = p.brand_id
                left join public.categories c on c.slug = p.category
               where li.look_id = l.id), ''))
  from public.looks l where l.id = p_look
$$;

create or replace function public.text_matches(p_doc text, p_q text) returns boolean
language sql immutable set search_path = '' as $$
  select not exists (
    select 1 from regexp_split_to_table(trim(coalesce(p_q, '')), '\s+') t
     where t <> '' and not (p_doc like '%' || public.norm(t) || '%'
                            or (char_length(t) >= 4 and extensions.word_similarity(public.norm(t), p_doc) >= 0.6)))
$$;

create or replace function public.search_looks(
  p_q text default null, p_brand text default null, p_category text default null, p_style text default null,
  p_size text default null, p_height_min numeric default null, p_height_max numeric default null,
  p_weight_min numeric default null, p_weight_max numeric default null, p_near_me boolean default false,
  p_sort text default 'new',   -- new | tryons | near | saves
  p_limit int default 20, p_offset int default 0
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m),
  base as (
    select l.id, l.published_at, l.tryon_count,
      (select count(*) from public.look_saves s where s.look_id = l.id) as saves,
      -- Bu kombinin, izleyene en yakın denemesinin puanı
      (select max(public.proximity_score((select m from v), tm.snapshot, public.tryon_main_item(t.id)->>'category'))
         from public.tryons t join public.tryon_measurements tm on tm.tryon_id = t.id
        where t.look_id = l.id and t.status = 'published' and t.user_id <> auth.uid() and public.visible_user(t.user_id)) as near
      from public.looks l
     where l.status = 'published' and public.visible_user(l.creator_id)
       and (p_style is null or p_style = any (l.style_tags))
       and (p_brand is null or exists (select 1 from public.look_items li join public.products p on p.id = li.product_id
              join public.brands b on b.id = p.brand_id where li.look_id = l.id and b.slug = p_brand))
       and (p_category is null or exists (select 1 from public.look_items li join public.products p on p.id = li.product_id
              where li.look_id = l.id and p.category = p_category))
       -- Beden/ölçü filtreleri: bu kombinin bu özelliklere uyan yayında bir denemesi var mı (gizli ölçüler kullanılmaz)
       and (p_size is null and p_height_min is null and p_height_max is null and p_weight_min is null and p_weight_max is null
            or exists (
              select 1 from public.tryons t left join public.tryon_measurements tm on tm.tryon_id = t.id
               where t.look_id = l.id and t.status = 'published' and public.visible_user(t.user_id)
                 and (p_size is null or exists (select 1 from public.tryon_items ti where ti.tryon_id = t.id
                        and public.norm(ti.size_bought) = public.norm(p_size)))
                 and (p_height_min is null or (coalesce(tm.visibility->>'height_cm', 'range') <> 'hidden' and (tm.snapshot->>'height_cm')::numeric >= p_height_min))
                 and (p_height_max is null or (coalesce(tm.visibility->>'height_cm', 'range') <> 'hidden' and (tm.snapshot->>'height_cm')::numeric <= p_height_max))
                 and (p_weight_min is null or (coalesce(tm.visibility->>'weight_kg', 'range') <> 'hidden' and (tm.snapshot->>'weight_kg')::numeric >= p_weight_min))
                 and (p_weight_max is null or (coalesce(tm.visibility->>'weight_kg', 'range') <> 'hidden' and (tm.snapshot->>'weight_kg')::numeric <= p_weight_max))))
       and (coalesce(trim(p_q), '') = '' or public.text_matches(public.look_search_doc(l.id), p_q))
  )
  select coalesce(jsonb_agg(public.look_card(x.id, (select m from v)) order by x.rn), '[]')
    from (select b.*, row_number() over (order by
            case when p_sort = 'near' then b.near end desc nulls last,
            case when p_sort = 'tryons' then b.tryon_count end desc,
            case when p_sort = 'saves' then b.saves end desc,
            b.published_at desc) rn
            from base b where not p_near_me or b.near >= 70
           order by rn limit least(p_limit, 50) offset greatest(p_offset, 0)) x
$$;

create or replace function public.search_products(
  p_q text default null, p_brand text default null, p_category text default null,
  p_limit int default 20, p_offset int default 0
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.product_card(x.id) order by x.rn), '[]')
    from (select p.id, row_number() over (order by p.created_at desc) rn
            from public.products p
            left join public.brands b on b.id = p.brand_id
            left join public.categories c on c.slug = p.category
           where (p_brand is null or b.slug = p_brand)
             and (p_category is null or p.category = p_category)
             and (coalesce(trim(p_q), '') = '' or public.text_matches(public.norm(
                   coalesce(b.name, '') || ' ' || array_to_string(coalesce(b.aliases, '{}'), ' ') || ' ' || p.name || ' ' ||
                   coalesce(c.label, '') || ' ' || array_to_string(coalesce(c.search_terms, '{}'), ' ') || ' ' ||
                   public.attribute_search_text(p.attributes)), p_q))
           order by p.created_at desc limit least(p_limit, 50) offset greatest(p_offset, 0)) x
$$;

create or replace function public.search_brands(p_q text default '', p_limit int default 10)
returns table (id uuid, name text, slug text, post_count int)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, b.slug,
    (select count(*) from public.products p where p.brand_id = b.id)::int as post_count
  from public.brands b
  where coalesce(trim(p_q), '') = ''
     or public.norm(b.name) like '%' || public.norm(p_q) || '%'
     or exists (select 1 from unnest(b.aliases) a where public.norm(a) like '%' || public.norm(p_q) || '%')
     or extensions.similarity(public.norm(b.name), public.norm(p_q)) > 0.35
  order by (public.norm(b.name) like public.norm(p_q) || '%') desc, post_count desc, public.norm(b.name)
  limit least(p_limit, 500)
$$;

create or replace function public.search_users(p_q text, p_limit int default 20)
returns table (username text, display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select pr.username, pr.display_name, pr.avatar_url
    from public.profiles pr
   where coalesce(trim(p_q), '') <> '' and public.visible_user(pr.id)
     and (pr.username like '%' || public.norm(p_q) || '%'
          or public.norm(pr.display_name) like '%' || public.norm(p_q) || '%')
   order by (pr.username like public.norm(p_q) || '%') desc, pr.follower_count desc, pr.username
   limit least(p_limit, 50)
$$;

-- ─────────────────────────────────────────────────────────────
-- Admin
-- ─────────────────────────────────────────────────────────────

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
end $$;

create or replace function public.admin_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return coalesce((select jsonb_agg(public.get_tryon(t.id) order by t.created_at)
                     from public.tryons t where t.status = 'pending'), '[]');
end $$;

create or replace function public.admin_review_tryon(p_id uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.tryons
     set status = case when p_approve then 'published' else 'rejected' end,
         reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end
   where id = p_id and status = 'pending';
end $$;

create or replace function public.admin_reports(p_include_resolved boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(x order by x->>'last_at' desc) from (
      select jsonb_build_object(
        'target_type', r.target_type, 'target_id', r.target_id,
        'open_count', count(*) filter (where r.resolved_at is null),
        'last_at', max(r.created_at),
        'reasons', jsonb_agg(jsonb_build_object('reason', r.reason, 'created_at', r.created_at,
                     'resolved', r.resolved_at is not null, 'resolution', r.resolution) order by r.created_at desc),
        'target', case r.target_type
          when 'look' then (select jsonb_build_object('title', l.title, 'status', l.status, 'owner_id', l.creator_id,
                              'owner', (select username from public.profiles where id = l.creator_id),
                              'cover_path', (select storage_path from public.look_photos where look_id = l.id order by position limit 1))
                              from public.looks l where l.id = r.target_id)
          when 'tryon' then (select jsonb_build_object('title', l.title, 'status', t.status, 'owner_id', t.user_id,
                              'owner', (select username from public.profiles where id = t.user_id),
                              'cover_path', (select storage_path from public.tryon_photos where tryon_id = t.id order by position limit 1))
                               from public.tryons t join public.looks l on l.id = t.look_id where t.id = r.target_id)
          else (select jsonb_build_object('title', pr.display_name, 'status', case when pr.is_suspended then 'suspended' else 'active' end,
                  'owner_id', pr.id, 'owner', pr.username, 'avatar_url', pr.avatar_url)
                  from public.profiles pr where pr.id = r.target_id) end
      ) as x
      from public.reports r
      group by r.target_type, r.target_id
      having p_include_resolved or count(*) filter (where r.resolved_at is null) > 0
    ) t), '[]');
end $$;

-- action: hide | remove | restore | copyright | dismiss | suspend | unsuspend
create or replace function public.admin_moderate(p_type text, p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_type = 'look' and p_action in ('hide', 'remove', 'restore', 'copyright') then
    update public.looks set status = case p_action when 'hide' then 'hidden' when 'restore' then 'published' else 'removed' end,
      is_featured = case when p_action = 'restore' then is_featured else false end where id = p_id;
  elsif p_type = 'tryon' and p_action in ('hide', 'remove', 'restore', 'copyright') then
    update public.tryons set status = case p_action when 'hide' then 'hidden' when 'restore' then 'published' else 'removed' end
     where id = p_id;
  elsif p_type = 'user' and p_action in ('suspend', 'unsuspend') then
    update public.profiles set is_suspended = (p_action = 'suspend') where id = p_id;
  end if;
  update public.reports set resolved_at = now(), resolution = case p_action when 'copyright' then 'telif' else p_action end
   where target_type = p_type and target_id = p_id and resolved_at is null;
end $$;

create or replace function public.admin_users(p_q text default '', p_limit int default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', pr.id, 'username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url,
      'role', pr.role, 'is_trusted', pr.is_trusted, 'is_suspended', pr.is_suspended,
      'tryon_count', (select count(*) from public.tryons t where t.user_id = pr.id and t.status = 'published'),
      'follower_count', pr.follower_count) order by pr.created_at desc)
    from (select * from public.profiles pr
           where coalesce(trim(p_q), '') = '' or pr.username like '%' || public.norm(p_q) || '%'
              or public.norm(pr.display_name) like '%' || public.norm(p_q) || '%'
           order by pr.created_at desc limit least(p_limit, 200)) pr), '[]');
end $$;

create or replace function public.admin_set_user(p_id uuid, p_role text default null, p_trusted boolean default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_id = auth.uid() and p_role is not null and p_role <> 'admin' then raise exception 'cannot_demote_self'; end if;
  update public.profiles set
    role = coalesce(p_role, role),
    is_trusted = coalesce(p_trusted, is_trusted)
   where id = p_id;
end $$;

-- Kontrol listesi: satışta olmayan, linki olmayan ya da 14 günden uzun süredir kontrol edilmemiş ürünler
create or replace function public.admin_products_check() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return coalesce((select jsonb_agg(public.product_card(p.id) || jsonb_build_object(
      'url', p.url, 'affiliate_url', p.affiliate_url,
      'look_count', (select count(distinct look_id) from public.look_items li where li.product_id = p.id),
      'clicks_30d', (select count(*) from public.link_clicks c where c.product_id = p.id and c.clicked_at > now() - interval '30 days'))
      order by p.in_stock, p.last_checked_at nulls first)
    from public.products p
   where not p.in_stock or coalesce(p.affiliate_url, p.url) is null
      or p.last_checked_at is null or p.last_checked_at < now() - interval '14 days'), '[]');
end $$;

create or replace function public.admin_mark_product(p_id uuid, p_in_stock boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.products set in_stock = p_in_stock, last_checked_at = now() where id = p_id;
end $$;

create or replace function public.admin_set_featured(p_look uuid, p_featured boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.looks set is_featured = p_featured where id = p_look;
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'pending', (select count(*) from public.tryons where status = 'pending'),
    'reports', (select count(distinct (target_type, target_id)) from public.reports where resolved_at is null),
    'products_check', (select count(*) from public.products p where not p.in_stock or coalesce(p.affiliate_url, p.url) is null
                         or p.last_checked_at is null or p.last_checked_at < now() - interval '14 days'),
    'clicks_7d', (select count(*) from public.link_clicks where clicked_at > now() - interval '7 days'));
end $$;

revoke execute on function public.assert_admin() from anon;

-- ─────────────────────────────────────────────────────────────
-- Storage
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('look-photos', 'look-photos', true, 5242880, array['image/webp', 'image/jpeg']),
       ('tryon-photos', 'tryon-photos', true, 5242880, array['image/webp', 'image/jpeg']),
       ('product-images', 'product-images', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "kendi klasörüne yükler" on storage.objects;
drop policy if exists "kendi dosyasını günceller" on storage.objects;
drop policy if exists "kendi dosyasını siler" on storage.objects;

-- Kişisel fotoğraflar her zaman "<kullanıcı id>/..." klasöründe
create policy "kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (bucket_id in ('look-photos', 'tryon-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kendi dosyasını günceller" on storage.objects for update to authenticated
  using (bucket_id in ('look-photos', 'tryon-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kendi dosyasını siler" on storage.objects for delete to authenticated
  using (bucket_id in ('look-photos', 'tryon-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
-- Ürün görselleri ortak klasörde; kullanıcı silinse de ürün görseli kalır
create policy "ürün görseli yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.can_create_looks());
create policy "ürün görselini siler" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.can_create_looks());

-- ─────────────────────────────────────────────────────────────
-- Eski tablolara dayanan fonksiyonların yeni hali
-- ─────────────────────────────────────────────────────────────

-- Rıza geri çekilince ölçüler ve denemelerdeki ölçü kopyaları silinir
create or replace function public.set_measurement_consent(p_consent boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_consent then
    update public.profile_private set measurement_consent_at = coalesce(measurement_consent_at, now())
     where user_id = auth.uid();
  else
    update public.profile_private set measurement_consent_at = null where user_id = auth.uid();
    delete from public.body_measurements where user_id = auth.uid();
    delete from public.tryon_measurements where user_id = auth.uid();
  end if;
end $$;

create or replace function public.admin_merge_brands(p_source uuid, p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_src public.brands;
begin
  perform public.assert_admin();
  if p_source = p_target then return; end if;
  select * into v_src from public.brands where id = p_source;
  if v_src.id is null then return; end if;
  update public.products set brand_id = p_target where brand_id = p_source;
  update public.brands
     set aliases = (select array_agg(distinct a) from unnest(aliases || v_src.aliases || array[v_src.name]) a)
   where id = p_target;
  delete from public.brands where id = p_source;
end $$;
