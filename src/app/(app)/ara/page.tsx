import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { PAGE_SIZE } from "@/lib/domain/looks";
import type { Category, FeedItem, ProductCard, StyleTag } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { SearchControls } from "./SearchControls";

export const metadata = { title: "Ara" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: string | string[] | undefined) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default async function SearchPage(props: PageProps<"/ara">) {
  const sp = await props.searchParams;
  const tab = (["kombinler", "urunler", "markalar", "kullanicilar"] as const).find((t) => t === sp.sekme) ?? "kombinler";
  const q = str(sp.q);
  const supabase = await createClient();

  const lookArgs = {
    p_q: q, p_brand: str(sp.marka), p_category: str(sp.kategori), p_style: str(sp.tarz), p_size: str(sp.beden),
    p_height_min: num(sp.boymin), p_height_max: num(sp.boymax), p_weight_min: num(sp.kilomin), p_weight_max: num(sp.kilomax),
    p_near_me: sp.yakin === "1", // misafirde yakınlık puanı olmadığından sonuç boş döner
    p_sort: (["new", "tryons", "near", "saves"] as const).find((s) => s === sp.sirala) ?? "new",
  };
  const productArgs = { p_q: q, p_brand: str(sp.marka), p_category: str(sp.kategori) };

  // Sonuçlar, kullanıcı ve filtre seçenekleri aynı anda çekilir
  const resultsQuery =
    tab === "markalar" ? supabase.rpc("search_brands", { p_q: q ?? "", p_limit: 60 })
    : tab === "kullanicilar" ? (q ? supabase.rpc("search_users", { p_q: q }) : Promise.resolve({ data: [] }))
    : tab === "urunler" ? supabase.rpc("search_products", { ...productArgs, p_limit: PAGE_SIZE })
    : supabase.rpc("search_looks", { ...lookArgs, p_limit: PAGE_SIZE });
  const [viewer, { data: resultData }, { data: categories }, { data: styles }, brandName] = await Promise.all([
    getViewer(),
    resultsQuery,
    supabase.from("categories").select("*").order("position"),
    supabase.from("style_tags").select("*").order("position"),
    str(sp.marka) ? supabase.from("brands").select("name").eq("slug", str(sp.marka)!).maybeSingle().then((r) => r.data?.name) : null,
  ]);

  let results: React.ReactNode;
  if (tab === "markalar") {
    const list = (resultData ?? []) as { id: string; name: string; slug: string; post_count: number }[];
    results = (
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {list.map((b) => (
          <li key={b.id}>
            <Link href={`/ara?marka=${b.slug}`} className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">{b.name}</span>
              <span className="text-sm text-muted">{b.post_count ? `${b.post_count} ürün` : ""}</span>
            </Link>
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">Marka bulunamadı.</li>}
      </ul>
    );
  } else if (tab === "kullanicilar") {
    const list = (resultData ?? []) as { username: string; display_name: string | null; avatar_url: string | null }[];
    results = (
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {list.map((u) => (
          <li key={u.username}>
            <Link href={`/u/${u.username}`} className="flex items-center gap-3 px-4 py-3">
              <Avatar path={u.avatar_url} name={u.display_name ?? u.username} size={36} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{u.display_name ?? u.username}</span>
                <span className="block text-xs text-muted">@{u.username}</span>
              </span>
            </Link>
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">{q ? "Kullanıcı bulunamadı." : "Bir isim ya da kullanıcı adı yaz."}</li>}
      </ul>
    );
  } else {
    results = (
      <InfiniteGrid
        initial={(resultData ?? []) as (FeedItem | ProductCard)[]}
        rpc={tab === "urunler" ? "search_products" : "search_looks"}
        args={tab === "urunler" ? productArgs : lookArgs}
        empty={<p className="py-10 text-center text-sm text-muted">Bu aramaya uygun sonuç yok. Filtreleri biraz gevşetmeyi dene.</p>}
      />
    );
  }

  return (
    <main className="px-4 pt-4">
      <SearchControls tab={tab} categories={(categories ?? []) as Category[]} styles={(styles ?? []) as StyleTag[]} loggedIn={!!viewer} brandName={brandName ?? null} />
      <div className="mt-4">{results}</div>
    </main>
  );
}
