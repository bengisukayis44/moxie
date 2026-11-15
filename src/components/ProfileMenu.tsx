"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportButton, Sheet } from "./Actions";
import { DotsIcon } from "./Icons";

// Profil menüsü: paylaş, şikayet et, engelle / engeli kaldır
export function ProfileMenu({ userId, username, blocked }: { userId: string; username: string; blocked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleBlock() {
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();
    const me = data?.claims?.sub;
    if (!me) return router.push("/giris");
    if (!blocked && !confirm(`@${username} engellensin mi? Birbirinizin içeriğini göremez, takipleşmeniz kaldırılır.`)) return;
    setBusy(true);
    if (blocked) await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", userId);
    else await supabase.from("blocks").insert({ blocker_id: me, blocked_id: userId });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // vazgeçildi
      }
    }
    await navigator.clipboard.writeText(url);
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 text-muted" aria-label="Menü"><DotsIcon className="h-5 w-5" /></button>
      {open && (
        <Sheet onClose={() => setOpen(false)} title={`@${username}`}>
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            <button type="button" onClick={share} className="w-full px-4 py-3 text-left text-sm">Profili paylaş</button>
            <ReportButton targetType="user" targetId={userId} label="Şikayet et" />
            <button type="button" disabled={busy} onClick={toggleBlock} className="w-full px-4 py-3 text-left text-sm text-terracotta">
              {blocked ? "Engeli kaldır" : "Engelle"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
