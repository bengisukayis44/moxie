"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readRecentLooks } from "@/components/RecentLook";
import { photoUrl } from "@/lib/domain/looks";
import type { LookCard } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";

// Son baktığı ve kaydettiği kombinler önce, sonra diğerleri
export function PickLook({ saved, explore }: { saved: LookCard[]; explore: LookCard[] }) {
  const [recent, setRecent] = useState<LookCard[]>([]);
  useEffect(() => {
    const ids = readRecentLooks();
    if (ids.length) createClient().rpc("look_cards", { p_ids: ids }).then(({ data }) => setRecent((data ?? []) as LookCard[]));
  }, []);

  const seen = new Set<string>();
  const groups: [string, LookCard[]][] = [
    ["Son baktıkların", recent],
    ["Kaydettiklerin", saved],
    ["Tüm kombinler", explore],
  ].map(([title, list]) => [title as string, (list as LookCard[]).filter((l) => !seen.has(l.id) && seen.add(l.id))] as [string, LookCard[]]);

  return (
    <div className="mt-5 space-y-6">
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <section key={title}>
          <h2 className="eyebrow mb-2">{title}</h2>
          <ul className="space-y-2">
            {list.map((l) => (
              <li key={l.id}>
                <Link href={`/k/${l.id}/dene`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card p-2">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-placeholder">
                    {l.cover_path && <Image src={photoUrl(l.cover_path, "look-photos")!} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{l.title}</span>
                    <span className="text-xs text-muted">{l.tryon_count ? `${l.tryon_count} kişi denedi` : "Henüz denenmedi"}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-royal px-3 py-1.5 text-xs font-semibold text-bg">Dene</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.every(([, l]) => !l.length) && <p className="py-10 text-center text-sm text-muted">Henüz kombin yok.</p>}
    </div>
  );
}
