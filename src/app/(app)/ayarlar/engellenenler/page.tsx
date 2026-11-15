import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { Unblock } from "../SettingsClient";

export const metadata = { title: "Engellenen hesaplar" };

export default async function BlockedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris?next=/ayarlar/engellenenler");
  const supabase = await createClient();
  const { data: blocks } = await supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", viewer.id).order("created_at", { ascending: false });
  const ids = (blocks ?? []).map((b) => b.blocked_id);
  const { data: users } = ids.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)
    : { data: [] };

  return (
    <main className="px-4 pt-3">
      <header className="flex items-center gap-3">
        <BackButton fallback="/ayarlar" />
        <h1 className="font-serif text-2xl">Engellenen hesaplar</h1>
      </header>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar path={u.avatar_url} name={u.display_name ?? u.username} size={36} />
            <span className="min-w-0 flex-1 truncate font-semibold">@{u.username}</span>
            <Unblock blockerId={viewer.id} blockedId={u.id} />
          </li>
        ))}
        {!users?.length && <li className="px-4 py-8 text-center text-sm text-muted">Engellediğin kimse yok.</li>}
      </ul>
    </main>
  );
}
