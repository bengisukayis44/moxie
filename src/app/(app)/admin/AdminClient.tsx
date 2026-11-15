"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TryonView } from "@/components/TryonView";
import { formatPrice, photoUrl } from "@/lib/domain/looks";
import type { LookCard, ProductCard, Role, TryonDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";

function useRpc() {
  const router = useRouter();
  return async (fn: string, args: Record<string, unknown>) => {
    const { error } = await createClient().rpc(fn, args);
    if (error) alert("İşlem başarısız: " + error.message);
    router.refresh();
  };
}

function Btn({ children, onClick, tone }: { children: React.ReactNode; onClick: () => unknown; tone?: "danger" | "primary" }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs ${tone === "danger" ? "border-royal text-royal" : tone === "primary" ? "border-ink bg-ink text-bg" : "border-line"}`}>
      {children}
    </button>
  );
}

// ── Onay kuyruğu ──

export function Queue({ tryons }: { tryons: TryonDetail[] }) {
  const call = useRpc();
  const [open, setOpen] = useState<string | null>(null);
  if (!tryons.length) return <p className="py-10 text-center text-sm text-muted">Bekleyen deneme yok. 🎉</p>;
  async function reject(id: string) {
    const reason = prompt("Reddetme sebebi (kullanıcıya gösterilir):", "Fotoğraf topluluk kurallarına uymuyor.");
    if (reason !== null) await call("admin_review_tryon", { p_id: id, p_approve: false, p_reason: reason });
  }
  return (
    <ul className="space-y-3">
      {tryons.map((t) => (
        <li key={t.id} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
          <div className="flex gap-3 p-3">
            <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg bg-placeholder">
              {t.photos[0] && <Image src={photoUrl(t.photos[0].path, "tryon-photos")!} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p><b>@{t.user.username}</b></p>
              <p className="truncate text-muted">{t.look.title}</p>
              <p className="mt-1 text-xs text-muted">{t.photos.length} fotoğraf · {t.items.filter((i) => i.worn !== "not_worn").length} parça</p>
              <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className="mt-1 text-xs font-semibold text-royal">{open === t.id ? "Kapat" : "İncele"}</button>
            </div>
          </div>
          {open === t.id && <div className="border-t border-line pb-3"><TryonView tryon={t} showLookLink={false} /></div>}
          <div className="flex gap-2 border-t border-line p-3">
            <Btn tone="primary" onClick={() => call("admin_review_tryon", { p_id: t.id, p_approve: true })}>Onayla</Btn>
            <Btn tone="danger" onClick={() => reject(t.id)}>Reddet</Btn>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Şikayetler ──

export type ReportGroup = {
  target_type: "look" | "tryon" | "user";
  target_id: string;
  open_count: number;
  last_at: string;
  reasons: { reason: string; created_at: string; resolved: boolean; resolution: string | null }[];
  target: { title: string | null; status: string; owner_id: string | null; owner: string | null; cover_path?: string | null; avatar_url?: string | null } | null;
};

const TYPE_LABEL = { look: "Kombin", tryon: "Deneme", user: "Kullanıcı" };

export function Reports({ groups }: { groups: ReportGroup[] }) {
  const call = useRpc();
  if (!groups.length) return <p className="py-10 text-center text-sm text-muted">Bekleyen şikayet yok. 🎉</p>;
  const act = (g: ReportGroup, action: string) => call("admin_moderate", { p_type: g.target_type, p_id: g.target_id, p_action: action });
  async function warn(g: ReportGroup) {
    if (!g.target?.owner_id) return;
    const message = prompt(`@${g.target.owner} kullanıcısına gidecek uyarı:`, "Paylaşımın topluluk kurallarımıza aykırı bulundu. Lütfen kuralları gözden geçir.");
    if (message) await call("admin_warn_user", { p_user: g.target.owner_id, p_message: message });
  }
  return (
    <ul className="space-y-3">
      {groups.map((g) => {
        const href = g.target_type === "look" ? `/k/${g.target_id}` : g.target_type === "tryon" ? `/d/${g.target_id}` : `/u/${g.target?.owner}`;
        const bucket = g.target_type === "look" ? "look-photos" : g.target_type === "tryon" ? "tryon-photos" : "avatars";
        const img = photoUrl(g.target?.cover_path ?? g.target?.avatar_url, bucket);
        return (
          <li key={`${g.target_type}${g.target_id}`} className="rounded-[var(--radius-card)] border border-line bg-card p-3">
            <div className="flex gap-3">
              <Link href={href} className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-placeholder">
                {img && <Image src={img} alt="" fill sizes="64px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <p><span className="eyebrow">{TYPE_LABEL[g.target_type]}</span> · <span className="text-muted">{g.target?.status ?? "silinmiş"}</span></p>
                <p className="truncate font-semibold">{g.target?.title ?? "—"} {g.target?.owner && <span className="font-normal text-muted">@{g.target.owner}</span>}</p>
                <p className="text-royal">{g.open_count} açık şikayet</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                  {g.reasons.slice(0, 4).map((r, i) => <li key={i} className={r.resolved ? "line-through" : ""}>• {r.reason}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.target_type === "user" ? (
                <>
                  {g.target?.status === "suspended" ? <Btn onClick={() => act(g, "unsuspend")}>Askıyı kaldır</Btn> : <Btn tone="danger" onClick={() => act(g, "suspend")}>Askıya al</Btn>}
                </>
              ) : (
                <>
                  {g.target?.status !== "hidden" && <Btn onClick={() => act(g, "hide")}>Gizle</Btn>}
                  {g.target?.status !== "removed" && <Btn tone="danger" onClick={() => confirm("Kaldırılsın mı?") && act(g, "remove")}>Kaldır</Btn>}
                  <Btn tone="danger" onClick={() => confirm("Telif nedeniyle kaldırılsın mı?") && act(g, "copyright")}>Telif nedeniyle kaldır</Btn>
                  {g.target?.status !== "published" && <Btn onClick={() => act(g, "restore")}>Yayına al</Btn>}
                </>
              )}
              <Btn onClick={() => act(g, "dismiss")}>Şikayeti yok say</Btn>
              {g.target?.owner_id && <Btn onClick={() => warn(g)}>Uyar</Btn>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Kullanıcılar ──

export type AdminUser = {
  id: string; username: string; display_name: string | null; avatar_url: string | null;
  role: Role; is_trusted: boolean; is_suspended: boolean; tryon_count: number; follower_count: number;
};

export function Users({ users, q }: { users: AdminUser[]; q: string }) {
  const call = useRpc();
  const router = useRouter();
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); router.replace(`/admin?sekme=kullanicilar&q=${encodeURIComponent(new FormData(e.currentTarget).get("q") as string)}`); }}>
        <input name="q" defaultValue={q} placeholder="Kullanıcı ara" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
      </form>
      <ul className="mt-3 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-line bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/u/${u.username}`} className="min-w-0">
                <b className="block truncate">@{u.username}</b>
                <span className="text-xs text-muted">{u.tryon_count} deneme · {u.follower_count} takipçi{u.is_suspended ? " · askıda" : ""}</span>
              </Link>
              <select value={u.role} onChange={(e) => call("admin_set_user", { p_id: u.id, p_role: e.target.value })} className="rounded-lg border border-line bg-bg px-2 py-1 text-xs">
                <option value="user">Kullanıcı</option>
                <option value="creator">Creator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn onClick={() => call("admin_set_user", { p_id: u.id, p_trusted: !u.is_trusted })}>{u.is_trusted ? "Güvenilir ✓ (kaldır)" : "Güvenilir yap"}</Btn>
              <Btn tone={u.is_suspended ? undefined : "danger"} onClick={() => call("admin_moderate", { p_type: "user", p_id: u.id, p_action: u.is_suspended ? "unsuspend" : "suspend" })}>
                {u.is_suspended ? "Askıyı kaldır" : "Askıya al"}
              </Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Ürün kontrol listesi ──

export type CheckProduct = ProductCard & { url: string | null; affiliate_url: string | null; look_count: number; clicks_30d: number };

export function ProductsCheck({ products }: { products: CheckProduct[] }) {
  const call = useRpc();
  if (!products.length) return <p className="py-10 text-center text-sm text-muted">Kontrol edilecek ürün yok. Tüm linkler son 14 günde kontrol edilmiş.</p>;
  return (
    <div>
      <p className="mb-3 text-xs text-muted">Satışta olmayan, linki olmayan veya 14 günden uzun süredir kontrol edilmemiş ürünler. Linki açıp kontrol et, sonra durumunu işaretle.</p>
      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-card p-3 text-sm">
            <Link href={`/urun/${p.id}`} className="block"><b>{p.brand}</b> {p.name}</Link>
            <p className="text-xs text-muted">
              {p.in_stock ? "Satışta" : "Satışta değil"} · {p.look_count} kombin · son 30 gün {p.clicks_30d} tıklama
              {p.last_checked_at && ` · kontrol: ${new Date(p.last_checked_at).toLocaleDateString("tr-TR")}`}
              {p.price != null && ` · ${formatPrice(p.price)}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(p.affiliate_url ?? p.url) ? <a href={(p.affiliate_url ?? p.url)!} target="_blank" rel="noopener" className="rounded-full border border-line px-3 py-1.5 text-xs">Linki aç ↗</a> : <span className="text-xs text-royal">Link yok</span>}
              <Btn tone="primary" onClick={() => call("admin_mark_product", { p_id: p.id, p_in_stock: true })}>Satışta ✓</Btn>
              <Btn tone="danger" onClick={() => call("admin_mark_product", { p_id: p.id, p_in_stock: false })}>Satışta değil</Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Öne çıkanlar (Keşfet seçkisi) ──

export function Featured({ looks }: { looks: LookCard[] }) {
  const call = useRpc();
  return (
    <div>
      <p className="mb-3 text-xs text-muted">Öne çıkan kombinler Keşfet&apos;te en üstte görünür.</p>
      <ul className="space-y-2">
        {looks.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-placeholder">
              {l.cover_path && <Image src={photoUrl(l.cover_path, "look-photos")!} alt="" fill sizes="44px" className="object-cover" />}
            </div>
            <Link href={`/k/${l.id}`} className="min-w-0 flex-1 text-sm">
              <b className="block truncate">{l.title}</b>
              <span className="text-xs text-muted">{l.tryon_count} deneme · {l.save_count} kayıt</span>
            </Link>
            <button type="button" onClick={() => call("admin_set_featured", { p_look: l.id, p_featured: !l.is_featured })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${l.is_featured ? "bg-royal text-bg" : "border border-line"}`}>
              {l.is_featured ? "★ Öne çıkan" : "Öne çıkar"}
            </button>
          </li>
        ))}
        {!looks.length && <li className="py-6 text-center text-sm text-muted">Henüz yayında kombin yok.</li>}
      </ul>
    </div>
  );
}

// ── Markalar ──

export function BrandAdmin({ brands }: { brands: Brand[] }) {
  const [filter, setFilter] = useState("");
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR");
  const list = brands.filter((b) => norm(b.name).includes(norm(filter)) || b.aliases.some((a) => norm(a).includes(norm(filter))));
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Marka ara" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
      <p className="mt-2 text-xs text-muted">Birleştir: soldaki markanın tüm ürünleri seçilen markaya taşınır, eski ad takma ad olarak saklanır.</p>
      <ul className="mt-3 space-y-2">
        {list.map((b) => <BrandRow key={b.id} brand={b} all={brands} />)}
      </ul>
    </div>
  );
}

type Brand = { id: string; name: string; slug: string; aliases: string[]; post_count: number };

function BrandRow({ brand, all }: { brand: Brand; all: Brand[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(brand.name);
  const [aliases, setAliases] = useState(brand.aliases.join(", "));
  const [target, setTarget] = useState("");
  const supabase = createClient();

  async function save() {
    const { error } = await supabase.rpc("admin_update_brand", {
      p_id: brand.id,
      p_name: name,
      p_aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
    });
    if (error) return alert(error.message);
    setEdit(false);
    router.refresh();
  }

  async function merge() {
    const t = all.find((b) => b.id === target);
    if (!t || !confirm(`"${brand.name}" → "${t.name}" ile birleştirilsin mi?`)) return;
    const { error } = await supabase.rpc("admin_merge_brands", { p_source: brand.id, p_target: target });
    if (error) return alert(error.message);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-line bg-card p-3 text-sm">
      {edit ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line px-2 py-1.5" />
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Takma adlar (virgülle)" className="w-full rounded-lg border border-line px-2 py-1.5" />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="rounded-full bg-ink px-3 py-1 text-bg">Kaydet</button>
            <button type="button" onClick={() => setEdit(false)} className="rounded-full border border-line px-3 py-1">Vazgeç</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{brand.name} <span className="font-normal text-muted">· {brand.post_count}</span></p>
            {brand.aliases.length > 0 && <p className="truncate text-xs text-muted">{brand.aliases.join(", ")}</p>}
          </div>
          <button type="button" onClick={() => setEdit(true)} className="shrink-0 text-royal">Düzenle</button>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-xs">
          <option value="">Şununla birleştir…</option>
          {all.filter((b) => b.id !== brand.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button type="button" disabled={!target} onClick={merge} className="rounded-full border border-line px-3 text-xs disabled:opacity-40">Birleştir</button>
      </div>
    </li>
  );
}
