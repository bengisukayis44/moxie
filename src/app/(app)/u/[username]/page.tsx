import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/Actions";
import { Avatar } from "@/components/Avatar";
import { CompletionCard } from "@/components/CompletionCard";
import { GearIcon } from "@/components/Icons";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { MeasurementChips } from "@/components/MeasurementChips";
import { ProfileMenu } from "@/components/ProfileMenu";
import { profileCompletion } from "@/lib/domain/measurements";
import { PAGE_SIZE, proximityLabel, ROLE_BADGE } from "@/lib/domain/looks";
import type { BodyMeasurements, FeedItem, PublicProfile } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getMyMeasurements, getViewer, type Viewer } from "@/lib/viewer";

export async function generateMetadata(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  return { title: `@${decodeURIComponent(username)}` };
}

const TABS = { denemeler: "tryons", kombinler: "looks", kaydedilenler: "saved" } as const;

export default async function ProfilePage(props: PageProps<"/u/[username]">) {
  const { username: raw } = await props.params;
  const { sekme } = await props.searchParams;
  const username = decodeURIComponent(raw).toLowerCase();
  const supabase = await createClient();

  const [{ data }, viewer, mine, { data: myWarnings }] = await Promise.all([
    supabase.rpc("get_profile", { p_username: username }),
    getViewer(),
    getMyMeasurements(),
    supabase.from("user_warnings").select("id, message, created_at").is("seen_at", null),
  ]);
  const profile = data as PublicProfile | null;
  if (!profile) notFound();

  if (profile.unavailable) {
    return (
      <main className="px-6 pt-24 text-center">
        <h1 className="font-serif text-2xl">@{profile.username}</h1>
        <p className="mt-2 text-muted">Bu profili görüntüleyemezsin.</p>
      </main>
    );
  }

  const showLooks = profile.look_count > 0 || profile.role !== "user";
  const tabKeys = (Object.keys(TABS) as (keyof typeof TABS)[]).filter((k) => (k === "kombinler" ? showLooks : k === "kaydedilenler" ? profile.is_me : true));
  const tab = tabKeys.find((k) => k === sekme) ?? "denemeler";
  const kind = TABS[tab];
  const { data: items } = profile.i_blocked ? { data: [] } : await supabase.rpc("profile_items", { p_username: username, p_kind: kind, p_limit: PAGE_SIZE });
  const near = proximityLabel(profile.proximity);
  const badge = ROLE_BADGE[profile.role];

  let completion: React.ReactNode = null;
  if (profile.is_me && viewer) {
    const percent = profileCompletion(viewer.profile, mine);
    const hiddenUntil = viewer.priv.completion_card_hidden_until;
    if (percent < 100 && (!hiddenUntil || new Date(hiddenUntil) < new Date())) {
      completion = <CompletionCard userId={viewer.id} percent={percent} href={nextStepHref(viewer, mine)} />;
    }
  }

  return (
    <main className="px-4 pt-4">
      <header className="flex items-start gap-4">
        <Avatar path={profile.avatar_url} name={profile.display_name ?? profile.username} size={76} />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate font-serif text-2xl leading-tight">{profile.display_name ?? profile.username}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
          {badge && <span className="mt-1 inline-block rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-semibold">{badge}</span>}
        </div>
        {profile.is_me ? (
          <Link href="/ayarlar" className="rounded-full p-2 text-muted" aria-label="Ayarlar"><GearIcon className="h-6 w-6" /></Link>
        ) : (
          <ProfileMenu userId={profile.id} username={profile.username} blocked={profile.i_blocked} />
        )}
      </header>

      <div className="mt-3 flex items-center gap-5 text-sm">
        <Link href={`/u/${profile.username}/takipciler`}><b>{profile.follower_count}</b> <span className="text-muted">takipçi</span></Link>
        <Link href={`/u/${profile.username}/takip`}><b>{profile.following_count}</b> <span className="text-muted">takip</span></Link>
        <span><b>{profile.tryon_count}</b> <span className="text-muted">deneme</span></span>
        {!profile.is_me && !profile.i_blocked && <span className="ml-auto"><FollowButton userId={profile.id} following={profile.is_following} /></span>}
      </div>
      {near && <span className="mt-2 inline-block rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-semibold text-terracotta">{near}</span>}
      {profile.bio && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{profile.bio}</p>}

      {profile.i_blocked && <p className="mt-4 rounded-xl bg-sand px-3 py-2 text-sm">Bu hesabı engelledin. İçeriklerini görmüyorsun.</p>}

      {profile.is_me && myWarnings?.map((w) => (
        <div key={w.id} className="mt-4 rounded-[var(--radius-card)] border border-terracotta bg-terracotta/5 p-3 text-sm">
          <p className="eyebrow mb-1">Ekipten uyarı</p>
          {w.message}
        </div>
      ))}
      {completion && <div className="mt-4">{completion}</div>}

      {!profile.i_blocked && (
        <>
          <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-card p-4">
            <p className="eyebrow mb-2">Ölçüler</p>
            <MeasurementChips m={profile.measurements} extra={[["Genelde üst", profile.usual_sizes.top], ["Genelde alt", profile.usual_sizes.bottom]]} />
            {profile.is_me && <Link href="/ayarlar/profil" className="mt-3 inline-block text-sm font-semibold text-terracotta">Profili düzenle →</Link>}
          </section>

          <nav className="mt-5 flex gap-6 border-b border-line text-sm">
            {tabKeys.map((k) => (
              <Link key={k} href={k === "denemeler" ? `/u/${profile.username}` : `/u/${profile.username}?sekme=${k}`}
                className={`-mb-px border-b-2 pb-2 ${tab === k ? "border-terracotta font-semibold" : "border-transparent text-muted"}`}>
                {{ denemeler: "Denemeleri", kombinler: "Kombinleri", kaydedilenler: "Kaydettikleri" }[k]}
              </Link>
            ))}
          </nav>
          <div className="mt-4">
            <InfiniteGrid
              initial={(items ?? []) as FeedItem[]}
              rpc="profile_items"
              args={{ p_username: username, p_kind: kind }}
              empty={
                <p className="py-10 text-center text-sm text-muted">
                  {kind === "saved" ? "Kaydettiğin kombinler burada görünecek." : kind === "looks" ? "Henüz kombin yok." : profile.is_me ? "Bir kombin seç ve dene; denemelerin burada görünür." : "Henüz deneme yok."}
                </p>
              }
            />
          </div>
        </>
      )}
    </main>
  );
}

// Kart dokununca ilk eksik adıma götürür
function nextStepHref(viewer: Viewer, m: BodyMeasurements | null) {
  if (!viewer.priv.measurement_consent_at) return "/hosgeldin?adim=4";
  if (m?.height_cm == null || m?.weight_kg == null) return "/hosgeldin?adim=5";
  if ([m.bust_cm, m.waist_cm, m.hip_cm, m.inseam_cm].some((v) => v == null)) return "/hosgeldin?adim=6";
  if (!m.usual_top_size || !m.usual_bottom_size) return "/hosgeldin?adim=7";
  return "/ayarlar/profil";
}
