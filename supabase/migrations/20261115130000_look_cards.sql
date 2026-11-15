-- Verilen kombin id'lerinin kartları (aynı sırada); "+" ekranındaki son bakılan kombinler için
create or replace function public.look_cards(p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select public.viewer_measurements() as m)
  select coalesce(jsonb_agg(public.look_card(l.id, (select m from v)) order by array_position(p_ids, l.id)), '[]')
    from public.looks l
   where l.id = any (p_ids[1:30]) and l.status = 'published' and public.visible_user(l.creator_id)
$$;
