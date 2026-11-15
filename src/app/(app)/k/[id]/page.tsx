import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton, LikeButton, ReportButton, SaveButton, ShareButton } from "@/components/Actions";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { LookCardView } from "@/components/Cards";
import { Gallery } from "@/components/Gallery";
import { Disclosure, ProductRow } from "@/components/ProductRow";
import { RememberLook } from "@/components/RecentLook";
import { TryonStrip } from "@/components/TryonStrip";
import { ROLE_BADGE } from "@/lib/domain/looks";
import type { LookDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_look", { p_id: id });
  return data as LookDetail | null;
}

export async function generateMetadata(props: PageProps<"/k/[id]">) {
  const look = await load((await props.params).id);
  return { title: look?.title ?? "Kombin", description: look?.description ?? undefined };
}

const STATUS_NOTE: Record<string, string> = {
  draft: "Taslak: sadece sen görüyorsun.",
  hidden: "Bu kombin gizlendi.",
  removed: "Bu kombin kaldırıldı.",
  archived: "Bu kombin arşivlendi.",
};

export default async function LookPage(props: PageProps<"/k/[id]">) {
  const { id } = await props.params;
  const look = await load(id);
  if (!look) notFound();
  const badge = look.creator ? ROLE_BADGE[look.creator.role ?? "user"] : null;

  return (
    <main>
      <RememberLook id={look.id} />
      <div className="relative">
        <BackButton className="absolute left-3 top-3 z-10" />
        <Gallery photos={look.photos.map((path) => ({ path }))} bucket="look-photos" alt={look.title} />
      </div>
      {STATUS_NOTE[look.status] && <p className="bg-royal px-4 py-2 text-sm text-bg">{STATUS_NOTE[look.status]}</p>}

      <div className="space-y-6 px-4 pt-4">
        <section>
          <h1 className="font-serif text-[1.75rem] leading-tight">{look.title}</h1>
          {look.creator && (
            <div className="mt-3 flex items-center gap-3">
              <Link href={`/u/${look.creator.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar path={look.creator.avatar_url} name={look.creator.display_name ?? look.creator.username} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{look.creator.display_name ?? look.creator.username}</span>
                  {badge && <span className="block text-[11px] text-muted">{badge}</span>}
                </span>
              </Link>
              {!look.creator.is_me && <FollowButton userId={look.creator.id} following={look.creator.is_following} small />}
            </div>
          )}
          {look.description && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{look.description}</p>}
          {look.style_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {look.style_tags.map((s) => (
                <Link key={s.slug} href={`/ara?tarz=${s.slug}`} className="rounded-full border border-line bg-card px-3 py-1 text-xs text-mocha-text">{s.label}</Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="eyebrow mb-3">Kombindeki ürünler</h2>
          <ul className="space-y-2.5">
            {look.items.map((p) => <li key={p.look_item_id}><ProductRow product={p} from="look" sourceId={look.id} /></li>)}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Bu kombini şunlar da denedi</h2>
            {look.tryon_total > 0 && <span className="text-sm text-muted">{look.tryon_total} kişi</span>}
          </div>
          {look.my_tryon && look.my_tryon.status !== "published" && (
            <Link href={`/d/${look.my_tryon.id}`} className="mb-3 block rounded-xl bg-lilac px-3 py-2 text-sm text-royal-dark">
              {look.my_tryon.status === "pending" ? "Denemen incelemede; onaylanınca burada görünecek." : "Denemen yayında değil."}{" "}
              <span className="font-semibold text-royal">Görüntüle</span>
            </Link>
          )}
          <TryonStrip lookId={look.id} tryons={look.tryons} total={look.tryon_total} myTryonId={look.my_tryon?.id ?? null} />
        </section>

        <div className="flex items-center gap-1 border-y border-line py-1">
          <LikeButton kind="look" id={look.id} liked={look.liked} count={look.like_count} />
          <SaveButton lookId={look.id} saved={look.saved} />
          <ShareButton title={look.title} />
          <div className="ml-auto flex items-center">
            {look.can_edit && <Link href={`/k/${look.id}/duzenle`} className="px-2 py-1.5 text-sm font-semibold">Düzenle</Link>}
            <ReportButton targetType="look" targetId={look.id} />
          </div>
        </div>

        {look.similar.length > 0 && (
          <section>
            <h2 className="eyebrow mb-3">Benzer kombinler</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {look.similar.map((l) => <LookCardView key={l.id} look={l} />)}
            </div>
          </section>
        )}
      </div>
      <Disclosure />
    </main>
  );
}
