import Link from "next/link";
import { FollowButton } from "@/components/Actions";
import { Avatar } from "@/components/Avatar";
import { Callout } from "@/components/Callout";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { Logo } from "@/components/Logo";
import { Disclosure } from "@/components/ProductRow";
import { PAGE_SIZE } from "@/lib/domain/looks";
import type { FeedItem, FollowUser } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getMyMeasurements, getViewer } from "@/lib/viewer";

const TABS = [
  ["kesfet", "Keşfet"],
  ["takip", "Takip"],
  ["yakin", "Bana yakın"],
] as const;

export default async function FeedPage(props: PageProps<"/">) {
  const { tab: raw } = await props.searchParams;
  const tab = TABS.some(([k]) => k === raw) ? (raw as string) : "kesfet";
  const rpc = tab === "takip" ? "feed_following" : tab === "yakin" ? "feed_near" : "feed_explore";
  const needsLogin = tab !== "kesfet";

  // Birbirini beklemeden paralel çek
  const supabase = await createClient();
  const [viewer, measurements, { data }] = await Promise.all([
    getViewer(),
    tab === "yakin" ? getMyMeasurements() : null,
    supabase.rpc(rpc, { p_limit: PAGE_SIZE }),
  ]);
  const items = (data ?? []) as FeedItem[];

  let content: React.ReactNode;
  if (needsLogin && !viewer) {
    content = (
      <Callout
        title={tab === "yakin" ? "Sana benzeyen vücutları gör" : "Sevdiğin hesapları takip et"}
        text={tab === "yakin" ? "Ölçülerine yakın kişilerin ne giydiğini ve hangi bedeni aldığını görmek için ücretsiz kaydol." : "Takip ettiğin kişilerin yeni kombinleri ve denemeleri burada toplanır."}
        href={`/giris?mod=kayit&next=/?tab=${tab}`}
        cta="Kayıt ol"
      />
    );
  } else if (tab === "yakin" && !hasEnoughMeasurements(measurements)) {
    content = (
      <Callout title="Ölçülerini ekle, sana benzeyenleri görelim" text="Boy ve kilo bile yeterli. Ölçülerin istediğin kadar gizli kalır." href="/hosgeldin?adim=4" cta="Ölçülerimi ekle" />
    );
  } else if (tab === "takip" && items.length === 0) {
    const { data: suggested } = await supabase.rpc("suggested_accounts", { p_limit: 6 });
    content = <Suggestions users={(suggested ?? []) as FollowUser[]} />;
  } else {
    content = (
      <InfiniteGrid
        initial={items}
        rpc={rpc}
        empty={
          <Callout
            title={tab === "yakin" ? "Henüz sana yakın bir deneme yok" : "Henüz kombin yok"}
            text={tab === "yakin" ? "Kombinleri deneyen kişiler arttıkça sana benzeyenler burada görünecek. İlk adımı sen at!" : "Yakında burada ekibin hazırladığı kombinler olacak."}
            href="/"
            cta="Kombinlere göz at"
          />
        }
      />
    );
  }

  return (
    <main>
      <header className="sticky top-0 z-30 bg-cream/95 px-4 pt-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Logo />
          {!viewer && <Link href="/giris" className="rounded-full border border-ink px-3 py-1 text-sm">Giriş yap</Link>}
        </div>
        <nav className="mt-2 flex gap-6 border-b border-line text-sm">
          {TABS.map(([k, label]) => (
            <Link key={k} href={k === "kesfet" ? "/" : `/?tab=${k}`}
              className={`-mb-px border-b-2 pb-2 ${tab === k ? "border-terracotta font-semibold text-ink" : "border-transparent text-muted"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="px-4 pt-4">{content}</div>
      {tab === "kesfet" && <Disclosure />}
    </main>
  );
}

function hasEnoughMeasurements(m: Awaited<ReturnType<typeof getMyMeasurements>> | null) {
  return !!m && [m.height_cm, m.weight_kg, m.bust_cm, m.waist_cm, m.hip_cm, m.inseam_cm].filter((v) => v != null).length >= 2;
}

function Suggestions({ users }: { users: FollowUser[] }) {
  return (
    <div>
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 text-center">
        <h2 className="font-serif text-xl">Henüz kimseyi takip etmiyorsun</h2>
        <p className="mt-1 text-sm text-muted">Bu hesaplarla başlayabilirsin; yeni kombinleri ve denemeleri burada görünür.</p>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {users.map((u) => (
          <li key={u.username} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar path={u.avatar_url} name={u.display_name ?? u.username} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{u.display_name ?? u.username}</span>
                <span className="block text-xs text-muted">@{u.username}</span>
              </span>
            </Link>
            <FollowButton userId={u.id} following={u.is_following} small />
          </li>
        ))}
        {users.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Şimdilik önerecek hesap yok.</li>}
      </ul>
    </div>
  );
}
