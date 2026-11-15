import Link from "next/link";
import type { FollowUser } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "./Actions";
import { Avatar } from "./Avatar";
import { BackButton } from "./BackButton";

export async function FollowListPage({ username, kind }: { username: string; kind: "followers" | "following" }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("follow_list", { p_username: username, p_kind: kind });
  const users = (data ?? []) as FollowUser[];
  return (
    <main className="px-4 pt-3">
      <header className="flex items-center gap-3">
        <BackButton fallback={`/u/${username}`} />
        <h1 className="font-serif text-2xl">{kind === "followers" ? "Takipçiler" : "Takip edilenler"}</h1>
      </header>
      <p className="mt-1 pl-12 text-sm text-muted">@{username}</p>
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
            {!u.is_me && <FollowButton userId={u.id} following={u.is_following} small />}
          </li>
        ))}
        {users.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Henüz kimse yok.</li>}
      </ul>
    </main>
  );
}
