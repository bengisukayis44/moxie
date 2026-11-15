-- Takip listeleri ve önerilen hesaplar kullanıcı id'sini de döndürür (takip butonu için)

create or replace function public.follow_list(p_username text, p_kind text, p_limit int default 50, p_offset int default 0) returns jsonb
language sql stable security definer set search_path = '' as $$
  with u as (select id from public.profiles where username = lower(p_username)),
  ids as (
    select case when p_kind = 'followers' then f.follower_id else f.following_id end as id, f.created_at
      from public.follows f, u
     where (p_kind = 'followers' and f.following_id = u.id) or (p_kind = 'following' and f.follower_id = u.id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pr.id, 'username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url, 'role', pr.role,
      'is_me', pr.id = auth.uid(),
      'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id))
      order by ids.created_at desc), '[]')
    from (select * from ids order by created_at desc limit least(p_limit, 100) offset greatest(p_offset, 0)) ids
    join public.profiles pr on pr.id = ids.id
   where public.visible_user(pr.id)
$$;

create or replace function public.suggested_accounts(p_limit int default 5) returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select style_tags from public.profiles where id = auth.uid())
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'username', x.username, 'display_name', x.display_name,
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
