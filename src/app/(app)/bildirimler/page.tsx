import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import type { AppNotification } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Bildirimler" };

function describe(n: AppNotification): { text: React.ReactNode; href: string } {
  const who = n.actor ? <b>@{n.actor.username}</b> : null;
  const others = n.others > 0 ? <> ve {n.others} kişi</> : null;
  const look = n.look ? <b>{n.look.title}</b> : "bir kombin";
  switch (n.type) {
    case "follow": return { text: <>{who} seni takip etmeye başladı.</>, href: `/u/${n.actor?.username}` };
    case "tryon_on_your_look": return { text: <>{who} {look} kombinini denedi.</>, href: `/d/${n.tryon_id}` };
    case "like_look": return { text: <>{who}{others} {look} kombinini beğendi.</>, href: `/k/${n.look?.id}` };
    case "like_tryon": return { text: <>{who}{others} {look} denemeni beğendi.</>, href: `/d/${n.tryon_id}` };
    case "tryon_approved": return { text: <>{look} denemen yayına alındı. 🎉</>, href: `/d/${n.tryon_id}` };
    case "tryon_rejected": return { text: <>{look} denemen yayına alınmadı.{n.data.reason && <span className="block text-muted">Sebep: {n.data.reason}</span>}</>, href: `/d/${n.tryon_id}` };
    case "new_look": return { text: <>{who} yeni bir kombin paylaştı: {look}</>, href: `/k/${n.look?.id}` };
    case "look_archived": return { text: <>Denediğin <b>{n.data.title ?? "kombin"}</b> kombini, sahibinin hesabı silindiği için arşivlendi. Denemen profilinde kalmaya devam ediyor.</>, href: "/" };
  }
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "şimdi";
  if (s < 3600) return `${Math.floor(s / 60)} dk`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa`;
  if (s < 604800) return `${Math.floor(s / 86400)} g`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris?next=/bildirimler");
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_notifications", { p_limit: 60 });
  const list = (data ?? []) as AppNotification[];

  return (
    <main className="px-4 pt-4">
      <MarkNotificationsRead />
      <h1 className="font-serif text-3xl">Bildirimler</h1>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {list.map((n) => {
          const { text, href } = describe(n);
          return (
            <li key={n.id}>
              <Link href={href} className={`flex items-start gap-3 px-4 py-3 ${n.unread ? "bg-lilac/40" : ""}`}>
                <Avatar path={n.actor?.avatar_url} name={n.actor?.username ?? "M"} size={36} />
                <p className="min-w-0 flex-1 text-sm leading-snug">{text}</p>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at)}</span>
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Henüz bildirim yok.</li>}
      </ul>
    </main>
  );
}
