"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookmarkIcon, CloseIcon, FlagIcon, HeartIcon, ShareIcon } from "./Icons";

// Girişsiz kullanıcıyı kayıt ekranına yönlendirir; giriş yapmışsa userId döner
async function requireUser(router: ReturnType<typeof useRouter>): Promise<string | null> {
  const { data } = await createClient().auth.getClaims();
  const id = data?.claims?.sub ?? null;
  if (!id) router.push(`/giris?mod=kayit&next=${encodeURIComponent(window.location.pathname)}`);
  return id;
}

export function LikeButton({ kind, id, liked: initialLiked, count: initialCount }: {
  kind: "look" | "tryon"; id: string; liked: boolean; count: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  async function toggle() {
    const userId = await requireUser(router);
    if (!userId) return;
    const on = !liked;
    setLiked(on);
    setCount((c) => c + (on ? 1 : -1));
    const table = kind === "look" ? "look_likes" : "tryon_likes";
    const col = kind === "look" ? "look_id" : "tryon_id";
    const supabase = createClient();
    const { error } = on
      ? await supabase.from(table).insert({ user_id: userId, [col]: id })
      : await supabase.from(table).delete().eq("user_id", userId).eq(col, id);
    if (error && error.code !== "23505") {
      setLiked(!on);
      setCount((c) => c + (on ? -1 : 1));
    }
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={liked} aria-label="Beğen" className={`flex items-center gap-1 rounded-full px-2 py-1.5 ${liked ? "text-royal" : ""}`}>
      <HeartIcon filled={liked} className="h-6 w-6" />
      <span className="text-sm tabular-nums">{count || ""}</span>
    </button>
  );
}

export function SaveButton({ lookId, saved: initialSaved }: { lookId: string; saved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  async function toggle() {
    const userId = await requireUser(router);
    if (!userId) return;
    const on = !saved;
    setSaved(on);
    const supabase = createClient();
    const { error } = on
      ? await supabase.from("look_saves").insert({ user_id: userId, look_id: lookId })
      : await supabase.from("look_saves").delete().eq("user_id", userId).eq("look_id", lookId);
    if (error && error.code !== "23505") setSaved(!on);
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label="Kaydet" className={`rounded-full px-2 py-1.5 ${saved ? "text-royal" : ""}`}>
      <BookmarkIcon filled={saved} className="h-6 w-6" />
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // kullanıcı vazgeçtiyse kopyalamaya düş
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button type="button" onClick={share} aria-label="Paylaş" className="flex items-center gap-1 rounded-full px-2 py-1.5">
      <ShareIcon className="h-6 w-6" />
      {copied && <span className="text-xs text-muted">Link kopyalandı</span>}
    </button>
  );
}

export function FollowButton({ userId, following: initial, small = false }: { userId: string | null; following: boolean; small?: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (!userId) return null;
  async function toggle() {
    const me = await requireUser(router);
    if (!me) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = following
      ? await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", userId)
      : await supabase.from("follows").insert({ follower_id: me, following_id: userId });
    if (!error || error.code === "23505") setFollowing(!following);
    setBusy(false);
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-full font-semibold ${small ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} ${following ? "border border-line bg-card text-ink" : "bg-ink text-bg"}`}
    >
      {following ? "Takiptesin" : "Takip et"}
    </button>
  );
}

const REASONS = [
  "Uygunsuz / müstehcen içerik",
  "Başkasının fotoğrafı / telif",
  "Taciz veya nefret söylemi",
  "Spam / reklam",
  "Yanıltıcı bilgi",
  "Diğer",
];

export function ReportButton({ targetType, targetId, label }: { targetType: "look" | "tryon" | "user"; targetId: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => (await requireUser(router)) && setOpen(true)}
        className={label ? "w-full px-4 py-3 text-left text-sm" : "rounded-full px-2 py-1.5 text-muted"}
        aria-label="Şikayet et"
      >
        {label ?? <FlagIcon className="h-5 w-5" />}
      </button>
      {open && <ReportSheet targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportSheet({ targetType, targetId, onClose }: { targetType: string; targetId: string; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();
    await supabase.from("reports").insert({
      reporter_id: data?.claims?.sub,
      target_type: targetType,
      target_id: targetId,
      reason: [reason, detail.trim()].filter(Boolean).join(" — ").slice(0, 500),
    });
    // Aynı kişi aynı içeriği ikinci kez bildirirse kayıt çakışır; kullanıcı için sonuç aynı
    setBusy(false);
    setSent(true);
  }

  return (
    <Sheet onClose={onClose} title={sent ? "Teşekkürler" : "Şikayet et"}>
      {sent ? (
        <p className="text-sm text-muted">Bildirimin ekibimize ulaştı. En kısa sürede inceleyeceğiz.</p>
      ) : (
        <>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${reason === r ? "border-royal" : "border-line"}`}>
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#5B2A86]" />
                {r}
              </label>
            ))}
          </div>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Eklemek istediğin bir şey var mı? (opsiyonel)" maxLength={300} rows={2}
            className="mt-3 w-full rounded-xl border border-line bg-bg p-3 text-sm" />
          <button type="button" disabled={!reason || busy} onClick={send} className="mt-3 w-full rounded-full bg-royal py-3 font-semibold text-bg disabled:opacity-40">
            Gönder
          </button>
        </>
      )}
    </Sheet>
  );
}

// Alttan açılan panel
export function Sheet({ title, onClose, children, tall = false }: { title?: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className={`mx-auto w-full max-w-md overflow-y-auto rounded-t-3xl bg-card pb-[calc(1.5rem+env(safe-area-inset-bottom))] ${tall ? "h-[92dvh]" : "max-h-[85dvh] p-6"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Kapat"><CloseIcon className="h-5 w-5" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
