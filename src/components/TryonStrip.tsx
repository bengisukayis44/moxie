"use client";

import Link from "next/link";
import { useState } from "react";
import type { TryonCard, TryonDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "./Actions";
import { TryonCardView } from "./Cards";
import { CloseIcon, PlusIcon } from "./Icons";
import { TryonView } from "./TryonView";

// "Bu kombini şunlar da denedi": yatay kartlar, en yakın vücut önde; dokununca deneme alttan açılır
export function TryonStrip({ lookId, tryons, total, myTryonId }: {
  lookId: string; tryons: TryonCard[]; total: number; myTryonId: string | null;
}) {
  const [open, setOpen] = useState<TryonDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function show(id: string) {
    setLoading(id);
    const { data } = await createClient().rpc("get_tryon", { p_id: id });
    setLoading(null);
    if (data) setOpen(data as TryonDetail);
  }

  const tryHref = `/k/${lookId}/dene`;

  if (tryons.length === 0) {
    return (
      <Link href={tryHref} className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed border-terracotta/50 bg-terracotta/5 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-terracotta text-cream">
          <PlusIcon className="h-7 w-7" />
        </span>
        <span>
          <span className="block font-serif text-xl">İlk deneyen sen ol</span>
          <span className="text-sm text-muted">Bu kombini henüz kimse denemedi. Üzerinde nasıl durduğunu ve aldığın bedeni paylaş.</span>
        </span>
      </Link>
    );
  }

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {tryons.map((t, i) => (
          <div key={t.id} className={`w-36 shrink-0 ${loading === t.id ? "opacity-60" : ""}`}>
            <TryonCardView tryon={t} closest={i === 0 && t.proximity != null} onOpen={() => show(t.id)} />
          </div>
        ))}
        {!myTryonId && (
          <Link href={tryHref} className="flex w-36 shrink-0 flex-col">
            <span className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-terracotta/50 bg-terracotta/5 text-terracotta">
              <PlusIcon className="h-8 w-8" />
              <span className="font-semibold">Sen de dene</span>
            </span>
          </Link>
        )}
      </div>
      {total > tryons.length && <p className="mt-2 text-xs text-muted">{total} denemeden en yakın {tryons.length} tanesi gösteriliyor.</p>}

      {open && (
        <Sheet onClose={() => setOpen(null)} tall>
          <div className="sticky top-0 z-10 flex items-center justify-between bg-card/95 px-4 py-3 backdrop-blur">
            <Link href={`/d/${open.id}`} className="text-sm font-semibold text-terracotta">Tam sayfada aç</Link>
            <button type="button" onClick={() => setOpen(null)} aria-label="Kapat"><CloseIcon className="h-5 w-5" /></button>
          </div>
          <TryonView tryon={open} showLookLink={false} />
        </Sheet>
      )}
    </>
  );
}
