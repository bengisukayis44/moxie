"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BackIcon, CloseIcon, PlusIcon } from "@/components/Icons";
import { BOTTOM_SIZES, SHOE_SIZES, TOP_SIZES } from "@/lib/domain/measurements";
import { FIT_LABELS, LENGTH_LABELS, MAX_TRYON_PHOTOS, photoUrl, POSE_LABELS } from "@/lib/domain/looks";
import type { Category, FitRating, LengthRating, LookDetail, TryonDetail, Worn } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";

type Photo = { key: string; preview: string; path: string | null; pose: string | null; failed?: boolean; existing?: boolean };
type Part = {
  look_item_id: string;
  worn: Worn | "";
  size_bought: string;
  fit_rating: FitRating | "";
  length_rating: LengthRating | "";
  fit_note: string;
  fabric_note: string;
  similar_brand: string;
  similar_name: string;
  similar_url: string;
};

const POSES = ["front", "side", "sitting"];
const WORN_LABELS: Record<Worn, string> = { same: "Bunu giydim", similar: "Benzerini giydim", not_worn: "Giymedim" };

export function TryonForm({ userId, look, categories, existing, hasMeasurements, suspended }: {
  userId: string; look: LookDetail; categories: Category[]; existing: TryonDetail | null; hasMeasurements: boolean; suspended: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<Photo[]>(
    () => existing?.photos.map((p) => ({ key: crypto.randomUUID(), preview: photoUrl(p.path, "tryon-photos")!, path: p.path, pose: p.pose, existing: true })) ?? [],
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [parts, setParts] = useState<Part[]>(() =>
    look.items.map((p) => {
      const e = existing?.items.find((x) => x.look_item_id === p.look_item_id);
      return {
        look_item_id: p.look_item_id,
        worn: e ? e.worn : "",
        size_bought: e?.size_bought ?? "",
        fit_rating: e?.fit_rating ?? "",
        length_rating: e?.length_rating ?? "",
        fit_note: e?.fit_note ?? "",
        fabric_note: e?.fabric_note ?? "",
        similar_brand: e?.similar_brand ?? "",
        similar_name: e?.similar_name ?? "",
        similar_url: e?.similar_url ?? "",
      };
    }),
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploading = photos.some((p) => !p.path && !p.failed);
  const photosValid = photos.length > 0 && !uploading && photos.every((p) => p.path);
  const partsValid = parts.every((p) => p.worn && (p.worn === "not_worn" || p.size_bought.trim())) && parts.some((p) => p.worn !== "not_worn");

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_TRYON_PHOTOS - photos.length);
    const fresh: Photo[] = picked.map((f, i) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f), path: null, pose: POSES[photos.length + i] ?? null }));
    setPhotos((p) => [...p, ...fresh]);
    await Promise.all(picked.map(async (file, i) => {
      const key = fresh[i].key;
      try {
        const path = await uploadImage(supabase, "tryon-photos", userId, file);
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, path } : x)));
      } catch {
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, failed: true } : x)));
      }
    }));
  }

  function removePhoto(key: string) {
    const ph = photos.find((p) => p.key === key);
    if (ph?.existing && ph.path) setRemoved((r) => [...r, ph.path!]);
    else if (ph?.path) supabase.storage.from("tryon-photos").remove([ph.path]);
    setPhotos((p) => p.filter((x) => x.key !== key));
  }

  function move(i: number, d: -1 | 1) {
    setPhotos((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  const setPart = (id: string, patch: Partial<Part>) => setParts((l) => l.map((p) => (p.look_item_id === id ? { ...p, ...patch } : p)));

  async function submit() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("save_tryon", {
      p_look: look.id,
      p_note: note,
      p_photos: photos.map((p) => ({ path: p.path, pose: p.pose })),
      p_items: parts.map((p) => ({ ...p, similar_url: normalizeUrl(p.similar_url) })),
    });
    setBusy(false);
    if (error || !data) {
      return setError(error?.message.includes("blocked") ? "Bu kombine deneme ekleyemezsin." : "Paylaşılamadı. Bilgileri kontrol edip tekrar dener misin?");
    }
    if (removed.length) await supabase.storage.from("tryon-photos").remove(removed);
    setResult(data as { id: string; status: string });
  }

  async function cancel() {
    if ((photos.some((p) => !p.existing) || parts.some((p) => p.worn)) && !confirm("Çıkılsın mı? Girdiğin bilgiler kaydedilmeyecek.")) return;
    const fresh = photos.filter((p) => !p.existing && p.path).map((p) => p.path!) ;
    if (fresh.length) await supabase.storage.from("tryon-photos").remove(fresh);
    router.back();
  }

  if (suspended) {
    return <main className="px-6 pt-20 text-center"><h1 className="font-serif text-2xl">Hesabın askıya alındı</h1><p className="mt-2 text-muted">Bu süre içinde deneme ekleyemezsin.</p></main>;
  }

  if (result) {
    const pending = result.status === "pending";
    return (
      <main className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
        <div className="animate-pop text-6xl">{pending ? "⏳" : "🎉"}</div>
        <h1 className="mt-5 font-serif text-3xl">{pending ? "Teşekkürler!" : "Denemen yayında!"}</h1>
        <p className="mt-2 max-w-xs text-muted">
          {pending ? "İncelemeden sonra yayında olacak. Onaylandığında sana haber vereceğiz." : "Senin gibi biri tam da bunu arıyordu."}
        </p>
        <div className="mt-8 w-full space-y-2">
          <Link href={`/d/${result.id}`} className="block rounded-full bg-terracotta py-4 font-semibold text-cream">Denememi gör</Link>
          <Link href={`/k/${look.id}`} className="block rounded-full border border-ink py-4 font-semibold">Kombine dön</Link>
        </div>
      </main>
    );
  }

  const field = "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-[15px]";

  return (
    <main className="px-4 pt-3">
      <header className="flex items-center justify-between">
        <button type="button" onClick={step === 1 ? cancel : () => setStep(step - 1)} className="-ml-2 rounded-full p-2" aria-label="Geri">
          {step === 1 ? <CloseIcon className="h-5 w-5" /> : <BackIcon className="h-5 w-5" />}
        </button>
        <p className="text-sm font-semibold">{existing ? "Denemeni düzenle" : "Sen de dene"} · {step}/3</p>
        <span className="w-9" />
      </header>
      <p className="mt-1 truncate text-center text-xs text-muted">{look.title}</p>

      {step === 1 && (
        <section className="animate-step pt-4">
          <h1 className="font-serif text-3xl">Üzerinde nasıl durdu?</h1>
          <p className="mt-1 text-sm text-muted">1–{MAX_TRYON_PHOTOS} fotoğraf. Önden, yandan ve otururken çekilenler en çok işe yarar. Sadece kendine ait ve kendinin bulunduğu fotoğrafları yükle.</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.key}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-placeholder">
                  <Image src={p.preview} alt="" fill unoptimized={!p.existing} sizes="33vw" className={`object-cover ${p.path ? "" : "opacity-50"}`} />
                  {!p.path && !p.failed && <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">Yükleniyor…</span>}
                  {p.failed && <span className="absolute inset-0 flex items-center justify-center bg-terracotta/70 p-2 text-center text-xs text-cream">Yüklenemedi</span>}
                  <button type="button" onClick={() => removePhoto(p.key)} className="absolute right-1.5 top-1.5 rounded-full bg-ink/60 p-1 text-cream" aria-label="Kaldır"><CloseIcon className="h-3.5 w-3.5" /></button>
                  <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full bg-card/90 p-1 disabled:invisible" aria-label="Sola taşı"><ArrowLeftIcon className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-full bg-card/90 p-1 disabled:invisible" aria-label="Sağa taşı"><ArrowRightIcon className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <select value={p.pose ?? ""} onChange={(e) => setPhotos((l) => l.map((x) => (x.key === p.key ? { ...x, pose: e.target.value || null } : x)))}
                  className="mt-1 w-full rounded-lg border border-line bg-card px-1 py-1 text-xs">
                  <option value="">Poz</option>
                  {Object.entries(POSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ))}
            {photos.length < MAX_TRYON_PHOTOS && (
              <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-placeholder text-muted">
                <PlusIcon className="h-7 w-7" />
                <span className="text-xs">{photos.length ? "Ekle" : "Fotoğraf seç"}</span>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <p className="mt-4 text-xs text-muted">Fotoğraflar yüklenmeden önce küçültülür, konum gibi gizli bilgiler silinir.</p>
          <Next disabled={!photosValid} onClick={() => setStep(2)}>{uploading ? "Yükleniyor…" : "Devam"}</Next>
        </section>
      )}

      {step === 2 && (
        <section className="animate-step pt-4">
          <h1 className="font-serif text-3xl">Hangi parçaları giydin?</h1>
          <p className="mt-1 text-sm text-muted">Giydiğin her parça için aldığın bedeni yaz. Gerisi opsiyonel.</p>
          <div className="mt-5 space-y-4">
            {look.items.map((product) => {
              const part = parts.find((p) => p.look_item_id === product.look_item_id)!;
              const group = categories.find((c) => c.slug === product.category)?.group_key;
              const hints = group === "shoe" ? SHOE_SIZES : group === "bottom" ? BOTTOM_SIZES : TOP_SIZES;
              const img = photoUrl(product.image_path, "product-images");
              return (
                <div key={product.look_item_id} className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {img && <Image src={img} alt="" fill sizes="48px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{product.brand}</p>
                      <p className="line-clamp-2 text-sm">{product.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-sand p-1 text-xs">
                    {(Object.keys(WORN_LABELS) as Worn[]).map((w) => (
                      <button key={w} type="button" onClick={() => setPart(part.look_item_id, { worn: w })}
                        className={`rounded-lg px-1 py-2 leading-tight ${part.worn === w ? "bg-card font-semibold shadow-sm" : "text-muted"}`}>
                        {WORN_LABELS[w]}
                      </button>
                    ))}
                  </div>
                  {part.worn === "similar" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <input value={part.similar_brand} onChange={(e) => setPart(part.look_item_id, { similar_brand: e.target.value })} maxLength={60} placeholder="Marka" className={field} />
                      <input value={part.similar_name} onChange={(e) => setPart(part.look_item_id, { similar_name: e.target.value })} maxLength={120} placeholder="Ürün adı" className={field} />
                      <input value={part.similar_url} onChange={(e) => setPart(part.look_item_id, { similar_url: e.target.value })} inputMode="url" placeholder="Link (opsiyonel)" className={`${field} col-span-2`} />
                    </div>
                  )}
                  {part.worn && part.worn !== "not_worn" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-sm font-semibold">Aldığın beden *</label>
                        <input value={part.size_bought} onChange={(e) => setPart(part.look_item_id, { size_bought: e.target.value.slice(0, 12) })}
                          placeholder="ör. 38, M, 28/32" className={`${field} mt-1 text-lg font-bold`} />
                        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                          {hints.map((s) => (
                            <button key={s} type="button" onClick={() => setPart(part.look_item_id, { size_bought: s })}
                              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${part.size_bought.toUpperCase() === s ? "border-terracotta bg-terracotta text-cream" : "border-line"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Segment label="Kalıp" options={FIT_LABELS} value={part.fit_rating} onChange={(v) => setPart(part.look_item_id, { fit_rating: v as FitRating | "" })} />
                      <Segment label="Boy" options={LENGTH_LABELS} value={part.length_rating} onChange={(v) => setPart(part.look_item_id, { length_rating: v as LengthRating | "" })} />
                      <textarea value={part.fit_note} onChange={(e) => setPart(part.look_item_id, { fit_note: e.target.value })} maxLength={500} rows={2} placeholder="Fit notu (ör. belde tam, boyu biraz uzun)" className={field} />
                      <textarea value={part.fabric_note} onChange={(e) => setPart(part.look_item_id, { fabric_note: e.target.value })} maxLength={500} rows={2} placeholder="Kumaş notu (ör. kalın, esnemiyor)" className={field} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Next disabled={!partsValid} onClick={() => setStep(3)}>Devam</Next>
        </section>
      )}

      {step === 3 && (
        <section className="animate-step pt-4">
          <h1 className="font-serif text-3xl">Son dokunuş</h1>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
            placeholder="Kısa bir not (opsiyonel) — ör. düğün için aldım, gün boyu rahattı"
            className="mt-4 w-full rounded-[var(--radius-card)] border border-line bg-card p-3 text-[15px]" />

          {!hasMeasurements && (
            <div className="mt-4 rounded-[var(--radius-card)] border border-terracotta/40 bg-terracotta/5 p-4 text-sm">
              <p><b>Ölçülerini eklersen denemen çok daha faydalı olur.</b> Sana benzeyenler, hangi bedenin kendilerine uyacağını senin denemene bakarak anlar.</p>
              <Link href="/hosgeldin?adim=4" className="mt-2 inline-block font-semibold text-terracotta">Ölçülerimi ekle →</Link>
            </div>
          )}

          <p className="eyebrow mb-2 mt-6">Önizleme</p>
          <div className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-lg bg-placeholder">
              {photos[0] && <Image src={photos[0].preview} alt="" fill unoptimized={!photos[0].existing} sizes="96px" className="object-cover" />}
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {look.items.map((pr) => {
                const p = parts.find((x) => x.look_item_id === pr.look_item_id)!;
                return (
                  <li key={pr.look_item_id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate"><b>{pr.brand}</b> {pr.name}</span>
                    {p.worn === "not_worn" ? <span className="shrink-0 text-xs text-muted">giymedim</span>
                      : <span className="shrink-0 rounded-md bg-terracotta px-1.5 font-bold text-cream">{p.size_bought.toUpperCase()}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-3 text-xs text-muted">Profilindeki güncel ölçüler bu denemeye kaydedilir (gizlilik ayarlarınla birlikte).</p>
          {error && <p className="mt-3 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{error}</p>}
          <Next disabled={busy} onClick={submit}>{busy ? "Paylaşılıyor…" : existing ? "Kaydet" : "Paylaş"}</Next>
        </section>
      )}
    </main>
  );
}

function Next({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="sticky bottom-20 mt-8 pb-2">
      <button type="button" disabled={disabled} onClick={onClick} className="w-full rounded-full bg-terracotta py-4 font-semibold text-cream shadow-lg disabled:opacity-40">{children}</button>
    </div>
  );
}

function Segment({ label, options, value, onChange }: { label: string; options: Record<string, string>; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-sm text-muted">{label}</span>
      <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-sand p-1 text-sm">
        {Object.entries(options).map(([k, v]) => (
          <button key={k} type="button" onClick={() => onChange(value === k ? "" : k)} className={`rounded-lg py-1.5 ${value === k ? "bg-card font-semibold shadow-sm" : "text-muted"}`}>{v}</button>
        ))}
      </div>
    </div>
  );
}

function normalizeUrl(u: string) {
  const t = u.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
