import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import type { LookCard, TryonDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { type AdminUser, BrandAdmin, type CheckProduct, Featured, ProductsCheck, Queue, type ReportGroup, Reports, Users } from "./AdminClient";

export const metadata = { title: "Admin" };

const TABS = [
  ["kuyruk", "Onay kuyruğu", "pending"],
  ["sikayetler", "Şikayetler", "reports"],
  ["kullanicilar", "Kullanıcılar", null],
  ["urunler", "Ürünler", "products_check"],
  ["markalar", "Markalar", null],
  ["one-cikanlar", "Öne çıkanlar", null],
] as const;

export default async function AdminPage(props: PageProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  const sp = await props.searchParams;
  const tab = TABS.find(([k]) => k === sp.sekme)?.[0] ?? "kuyruk";
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("admin_stats");

  let content: React.ReactNode;
  if (tab === "kuyruk") {
    const { data } = await supabase.rpc("admin_queue");
    content = <Queue tryons={(data ?? []) as TryonDetail[]} />;
  } else if (tab === "sikayetler") {
    const { data } = await supabase.rpc("admin_reports", { p_include_resolved: sp.tumu === "1" });
    content = (
      <>
        <Link href={sp.tumu === "1" ? "/admin?sekme=sikayetler" : "/admin?sekme=sikayetler&tumu=1"} className="mb-3 inline-block text-xs text-muted underline">
          {sp.tumu === "1" ? "Sadece açık şikayetler" : "Çözülmüşleri de göster"}
        </Link>
        <Reports groups={(data ?? []) as ReportGroup[]} />
      </>
    );
  } else if (tab === "kullanicilar") {
    const q = typeof sp.q === "string" ? sp.q : "";
    const { data } = await supabase.rpc("admin_users", { p_q: q });
    content = <Users users={(data ?? []) as AdminUser[]} q={q} />;
  } else if (tab === "urunler") {
    const { data } = await supabase.rpc("admin_products_check");
    content = <ProductsCheck products={(data ?? []) as CheckProduct[]} />;
  } else if (tab === "markalar") {
    const { data } = await supabase.rpc("search_brands", { p_q: "", p_limit: 500 });
    const { data: all } = await supabase.from("brands").select("id, name, slug, aliases").order("name");
    const counts = Object.fromEntries((data ?? []).map((b: { id: string; post_count: number }) => [b.id, b.post_count]));
    content = <BrandAdmin brands={(all ?? []).map((b) => ({ ...b, post_count: counts[b.id] ?? 0 }))} />;
  } else {
    const { data } = await supabase.rpc("feed_explore", { p_limit: 50 });
    content = <Featured looks={(data ?? []) as LookCard[]} />;
  }

  return (
    <main className="px-4 pt-3">
      <header className="flex items-center gap-3">
        <BackButton fallback="/ayarlar" />
        <h1 className="font-serif text-2xl">Admin</h1>
        {stats?.clicks_7d != null && <span className="ml-auto text-xs text-muted">Son 7 gün: {stats.clicks_7d} mağaza tıklaması</span>}
      </header>
      <nav className="no-scrollbar mt-4 flex gap-5 overflow-x-auto border-b border-line text-sm">
        {TABS.map(([k, label, stat]) => {
          const n = stat ? stats?.[stat] : 0;
          return (
            <Link key={k} href={`/admin?sekme=${k}`} className={`-mb-px shrink-0 border-b-2 pb-2 ${tab === k ? "border-terracotta font-semibold" : "border-transparent text-muted"}`}>
              {label}{n ? <span className="ml-1 rounded-full bg-terracotta px-1.5 text-[10px] font-bold text-cream">{n}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4">{content}</div>
    </main>
  );
}
