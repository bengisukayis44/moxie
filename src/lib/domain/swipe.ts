// Keşfet'in tam ekran kaydırmalı akışı için veri: kombin kartı + ürünleri.
// React'ten bağımsız; web ve ileride mobil aynı şekilde kullanabilir.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LookCard, LookDetail, ProductCard } from "./types";

export type SwipeLook = {
  id: string;
  title: string;
  photo: string | null;
  photoCount: number;
  creator: LookDetail["creator"];
  tryonTotal: number;
  nearTryon: boolean;
  items: ProductCard[];
};

export const SWIPE_PAGE = 6;

/** Keşfet sırasıyla kombinleri ve her birinin ürünlerini getirir. */
export async function loadSwipeLooks(supabase: SupabaseClient, offset: number, limit = SWIPE_PAGE): Promise<SwipeLook[]> {
  const { data } = await supabase.rpc("feed_explore", { p_limit: limit, p_offset: offset });
  const cards = ((data ?? []) as LookCard[]).filter((c) => c.kind === "look");
  const details = await Promise.all(
    cards.map(async (c) => (await supabase.rpc("get_look", { p_id: c.id })).data as LookDetail | null),
  );
  return cards.map((c, i) => {
    const d = details[i];
    return {
      id: c.id,
      title: c.title,
      photo: d?.photos[0] ?? c.cover_path,
      photoCount: d?.photos.length ?? 1,
      creator: d?.creator ?? null,
      tryonTotal: d?.tryon_total ?? c.tryon_count,
      nearTryon: c.near_tryon,
      items: d?.items ?? [],
    };
  });
}
